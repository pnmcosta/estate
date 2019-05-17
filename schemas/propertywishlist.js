const TABLE_NAME = 'wishlistdata',
	NOSQL_NAME = 'wishlist';

NEWSCHEMA('PropertyWishlist').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('useremail', 'Email');

	schema.setSave(function($) {

		var model = $.clean();
		var isUpdate = !!model.id;
		var user = $.ip;
		var nosql = NOSQL(NOSQL_NAME);

		if (isUpdate) {
			model.dateupdated = F.datetime;
			model.userupdated = user;
		} else {
			model.id = UID();
			model.usercreated = user;
			model.datecreated = F.datetime;
		}

		var db = isUpdate ? nosql.modify(model).where('id', model.id).backup(user).log('Update: ' + model.id, user) : nosql.insert(model).log('Create: ' + model.id, user);

		db.callback(function() {
			$SAVE('Event', {
				type: 'wishlist/save',
				id: model.id,
				user: user,
				body: model.id
			}, NOOP, $);
			EMIT('wishlist.save', model);
			$.success(model.id);
			refresh_cache();
		});
	});

	// Gets a specific wishlist (does not return properties)
	schema.setGet(function($) {

		var options = $.options;
		var isAdmin = F.functions.isAdminController($.controller);

		var filter = NOSQL(NOSQL_NAME).one();
		options.id && filter.where('id', options.id);
		$.id && filter.where('id', $.id);

		filter.callback(function(err, response) {

			if (err) {
				$.callback();
				return;
			}

			$.callback(response);
		}, 'error-wishlist-404');
	});

	schema.addWorkflow('send', function($) {
		var options = $.options;

		// find the wishlist
		var wishlist;
		Object.keys(F.global.wishlists).forEach(function(key) {
			if (F.global.wishlists[key].id === options.id) {
				wishlist = F.global.wishlists[key];
				return false;
			}
		});

		if (!wishlist) {
			return $.invalid('id');
		} else if (wishlist.useremail) {
			return $.invalid();
		}

		options.token = wishlist_secret(wishlist.id, wishlist.usercreated, options.email);

		MAIL(options.email, 'Your properties wishlist', '=?/mails/wishlist', options, $.language);
		$.callback(options.token);
		$SAVE('Event', { type: 'wishlist/send', user: options.email, id: options.id }, NOOP, $);
	});

	schema.addWorkflow('remove', function($) {
		var options = $.options;

		$GET('PropertyWishlist', { id: options.id }, function(err, response) {

			if (err)
				return $.invalid(err);

			if (!response || !response.id) {
				$.invalid();
				return;
			}

			var key = wishlist_secret(response.id, response.usercreated, response.useremail);
			TABLE(TABLE_NAME).remove().where('id', response.id).where('property', options.property).callback(function() {
				if (!F.global.wishlists[key])
					return;
				var index = F.global.wishlists[key].properties.indexOf(options.property);
				if (index > -1)
					F.global.wishlists[key].properties.splice(index, 1);
			});

			$.success();
		}, $);
	});

	schema.addWorkflow('clear', function($) {
		var options = $.options;

		$GET('PropertyWishlist', { id: options.id }, function(err, response) {

			if (err)
				return $.invalid(err);

			if (!response || !response.id) {
				$.invalid();
				return;
			}

			var key = wishlist_secret(response.id, response.usercreated, response.useremail);
			TABLE(TABLE_NAME).remove().where('id', response.id).callback(function() {
				if (!F.global.wishlists[key])
					return;
				F.global.wishlists[key].properties = [];
			});

			$.success();
		}, $);
	});
	schema.addWorkflow('add', function($) {
		var options = $.options;

		var isUpdate = !!options.id;
		// check if property exists
		$GET('Property', { id: options.property }, function(err, response) {
			if (err) {
				$.invalid(err);
				return;
			}

			if (!response || !response.id) {
				$.invalid('error-wishlist-property-404');
				return;
			}

			var propertyId = response.id;

			// create wishlist if not yet
			if (isUpdate) {
				$GET('PropertyWishlist', { id: options.id }, function(err, response) {

					if (err) {
						$.invalid(err);
						return;
					}

					if (!response || !response.id) {
						$.invalid('error-wishlist-404');
						return;
					}
					var key = wishlist_secret(response.id, response.usercreated, response.useremail);
					TABLE(TABLE_NAME).insert({ id: response.id, property: propertyId, dateadded: NOW }, true).where('id', response.id)
						.where('property', propertyId).callback(function() {
							if (!F.global.wishlists[key])
								return;

							if (F.global.wishlists[key].properties.indexOf(propertyId) === -1)
								F.global.wishlists[key].properties.push(propertyId);
						});

					$.callback(key);
				}, $);
			} else {
				$SAVE('PropertyWishlist', {}, function(err, response) {

					if (err) {
						$.invalid(err);
						return;
					}

					if (!response || !response.success) {
						$.invalid('error-wishlist-save');
						return;
					}

					var key = wishlist_secret(response.value, $.ip, '');
					TABLE(TABLE_NAME).insert({ id: response.value, property: propertyId, dateadded: NOW }).callback(function() {
						if (!F.global.wishlists[key])
							return;
						if (F.global.wishlists[key].properties.indexOf(propertyId) === -1)
							F.global.wishlists[key].properties.push(propertyId);
					});
					$.callback(key);
				}, $);
			}
		});

	});

	schema.addWorkflow('listing', function($) {
		var options = CLONE($.options);
		var empty = {
			count: 0,
			items: [],
			limit: options.limit,
			pages: 1,
			page: 1
		};
		if (!options || !options.id) {
			//empty
			$.callback(empty);
			return;
		}

		$GET('PropertyWishlist', { id: options.id }, function(err, wishlist) {

			if (err || (!wishlist || !wishlist.id)) {
				$.callback(empty);
				return;
			}

			// get properties in wishlist
			wishlist_properties(wishlist.id, function(err, ids) {

				if (!err && ids && ids.length) {
					//reuse workflow options, but remove the id of the wishlist
					delete options.id;
					options.ids = ids;
					$QUERY('Property', options, function(err, response) {
						response.wishlist = wishlist;
						$.callback(response);
					});
				} else {
					empty.wishlist = wishlist;
					$.callback(empty);
				}
			});
		}, $);
	});


});

function wishlist_secret(id, user, email) {
	var arr = [];
	id && (arr.push(id));
	user && (arr.push(user));
	email && email.length && (arr.push(email));
	var key = arr.join(':');
	return (key + ':' + F.config.secret + key.hash()).md5();
}

function wishlist_properties(id, callback) {
	TABLE(TABLE_NAME).find2().where('id', id).fields('property').callback(function(err, docs) {
		callback(null, docs ? docs.map(a => a.property) : []);
	});
}

function wishlist_unpublish(value) {
	var builder = TABLE(TABLE_NAME).remove();
	if (value instanceof Array)
		builder.in('property', value);
	else
		builder.where('property', value);

	builder.callback(function() {
		refresh_cache();
	});

}
function refresh() {
	F.global.wishlists = {};

	NOSQL(NOSQL_NAME).find().callback(function(err, response) {
		if (err) {
			return;
		}
		var dbWishlists = {};
		response.wait(function(wishlist, next) {
			var key = wishlist_secret(wishlist.id, wishlist.usercreated, wishlist.useremail);
			wishlist_properties(wishlist.id, function(err, ids) {
				if (!err && ids && ids.length) {
					wishlist.properties = ids;
				} else {
					wishlist.properties = [];
				}
				dbWishlists[key] = wishlist;
				next();
			});

		}, () => (F.global.wishlists = dbWishlists), 2);
	});
}

function refresh_cache() {
	setTimeout2('wishlists', refresh, 1000);
}

ON('settings', function() {
	wishlist_clean();
});

ON('service', function(counter) {
	counter % 2 === 0 && refresh();
});

ON('properties.save', function(value) {
	(value.ispublished2 && !value.ispublished) && wishlist_unpublish(value.id);
});

ON('wishlists.unpublish', function(value) {
	wishlist_unpublish(value);
});

F.schedule('05:00', '1 day', function() {
	// get wishlists that are not saved and older than 7 days.
	wishlist_clean();
});

function wishlist_clean() {
	NOSQL(NOSQL_NAME).remove().backup('clean').empty('useremail').where('datecreated', '<=', NOW.add('-7 days')).each(function(doc, repository) {
		if (!doc || !doc.id) return;
		(!repository.arr) && (repository.arr = []);
		repository.arr.push(doc.id);
	}).callback(function(err, count, count2, repository) {
		if (repository.arr && repository.arr.length) {
			NOSQL(NOSQL_NAME).clean();
			TABLE(TABLE_NAME).remove().in('id', repository.arr).callback(function() {
				TABLE(TABLE_NAME).clean();
				refresh_cache();
			});
		} else {
			refresh_cache();
		}
	});
}