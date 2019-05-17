const Fs = require('fs');
const settingsFile = F.path.databases('settingsproperties.json');

NEWSCHEMA('PropertySettings').make(function(schema) {
	schema.define('templates', '[SettingsKeyValue]');
	schema.define('types', '[String(50)]');
	schema.define('status', '[String(50)]');
	schema.define('locations', String);
	schema.define('currencies', '[String(3)]', true);

	// Saves settings into the file
	schema.setSave(function($) {
		if ($.controller && (!$.user || !$.user.sa))
			return $.invalid('error-propertysettings-404');

		var model = $.model;
		var settings = U.extend({}, model.$clean());

		// Writes settings into the file
		Fs.writeFile(settingsFile, JSON.stringify(settings), function() {
			EMIT('properties.settings.save', settings);
			$SAVE('Event', {
				type: 'propertysettings/save',
				id: model.id,
				user: $.user.name,
				admin: true
			}, NOOP, $);
			refresh_settings();
			$.success();
		});
	});

	// Gets settings
	schema.setGet(function($) {
		if ($.controller && (!$.user || !$.user.sa))
			return $.invalid('error-propertysettings-404');

		Fs.readFile(settingsFile, function(err, data) {

			var settings = null;

			if (err) {
				settings = $.model.$clean();
			} else
				settings = data.toString('utf8').parseJSON(true);

			$.callback(settings);
		});
	});
});
NEWSCHEMA('PropertyAgent').make(function(schema) {
	schema.define('name', 'String(50)');
	schema.define('email', 'String(100)');
	schema.define('phone', 'String(30)');
});
NEWSCHEMA('PropertyContact').make(function(schema) {
	schema.define('name', 'String(50)');
	schema.define('email', 'String(100)');
	schema.define('phone', 'String(30)');
});

NEWSCHEMA('PropertyDescriptor').make(function(schema) {
	schema.define('name', 'String(50)');
	schema.define('value', String);
});

NEWSCHEMA('PropertyPrice').make(function(schema) {
	schema.define('id', 'String(10)');
	schema.define('currency', 'String(3)');
	schema.define('price', Number);
});

NEWSCHEMA('Property').make(function(schema) {
	schema.define('id', 'UID');
	schema.define('template', 'String(30)');
	schema.define('name', 'String(100)', true);
	schema.define('contact', 'PropertyContact');
	schema.define('agent', 'PropertyAgent')({ name: 'Agent Name', email: 'info@estate.com', phone: '+351 123 123 123' });
	schema.define('description', 'String(1000)');
	schema.define('search', 'String(1000)');
	schema.define('pictures', '[String]'); // URL addresses for pictures
	schema.define('body', String);
	schema.define('bodywidgets', '[String(22)]'); // List of all used widgets
	schema.define('ispublished', Boolean)(false);
	schema.define('date', Date);
	schema.define('widgets', '[Object]'); // List of dynamic widgets, contains Array of ID widget
	schema.define('location', 'String(300)', true);
	schema.define('prices', '[PropertyPrice]');
	schema.define('pricelabel', 'String(30)');
	schema.define('priceprefix', 'String(30)');
	schema.define('ispriceonrequest', Boolean)(true);
	schema.define('isnew', Boolean);
	schema.define('isfeatured', Boolean);
	schema.define('isonoffer', Boolean);
	schema.define('linker', 'String(50)');
	schema.define('status', 'String(50)', function(val) {
		if (F.global.config.properties.status && F.global.config.properties.status.indexOf(val) === -1)
			return '@property-status-invalid';
		return val && val.length > 0;
	});
	schema.define('type', 'String(50)');
	schema.define('reference', 'String(20)');
	schema.define('bedrooms', Number);
	schema.define('bathrooms', Number);
	schema.define('receptions', Number);
	schema.define('floors', Number);
	schema.define('descriptors', '[PropertyDescriptor]');
	schema.define('features', '[String(50)]');
	schema.allow('ispublished2');

	// Gets listing
	schema.setQuery(function($) {

		var opt = $.options === EMPTYOBJECT ? $.query : $.options;
		var isAdmin = F.functions.isAdminController($.controller);
		var filter = NOSQL('properties').find();
		var currency = opt.currency || G.properties.defaultCurrency;

		filter.paginate(opt.page, opt.limit, 70);
		if (isAdmin) {
			opt.name && filter.adminFilter('name', opt, String);
			opt.location && filter.adminFilter('location', opt, String);
			opt.status && filter.adminFilter('status', opt, String);
			opt.price && filter.adminFilter('price', opt, Number, 'priceIn' + currency);
			opt.type && filter.adminFilter('type', opt, String);
		} else {
			opt.location && filter.like('linker_location', opt.location, 'beg');
			opt.status && filter.in('status', opt.status);
			opt.published && filter.where('ispublished', true);
			opt.type && filter.where('type', opt.type);
			opt.search && filter.like('search', opt.search.keywords(true, true));
			opt.skip && filter.where('id', '<>', opt.skip);
			opt.isnew && filter.where('isnew', true);
			opt.isfeatured && filter.where('isfeatured', true);
			opt.isonoffer && filter.where('isonoffer', true);
			opt.reference && filter.like('reference', opt.reference);
			if (opt.bedrooms) {
				if (Array.isArray(opt.bedrooms) && opt.bedrooms.length === 2)
					filter.between('bedrooms', opt.bedrooms[0], opt.bedrooms[1]);
				else
					filter.where('bedrooms', '>=', opt.bedrooms);
			}
			if (opt.bathrooms) {
				if (Array.isArray(opt.bathrooms) && opt.bathrooms.length === 2)
					filter.between('bathrooms', opt.bathrooms[0], opt.bathrooms[1]);
				else
					filter.where('bathrooms', '>=', opt.bathrooms);
			}
			if (opt.receptions) {
				if (Array.isArray(opt.receptions) && opt.receptions.length === 2)
					filter.between('receptions', opt.receptions[0], opt.receptions[1]);
				else
					filter.where('receptions', '>=', opt.receptions);
			}
			if (opt.floors) {
				if (Array.isArray(opt.floors) && opt.floors.length === 2)
					filter.between('floors', opt.floors[0], opt.floors[1]);
				else
					filter.where('floors', '>=', opt.floors);
			}
			if (opt.price) {
				if (Array.isArray(opt.price) && opt.price.length === 2)
					filter.between('priceIn' + currency, opt.price[0], opt.price[1]);
				else
					filter.where('priceIn' + currency, '>=', opt.price);
			}

			opt.features && filter.in('features', opt.features);
			opt.ids && filter.in('id', opt.ids);
		}

		if (opt.sort) {
			// fix price sorting
			if (opt.sort.indexOf('price') === 0) {
				opt.sort = opt.sort.replace('price', 'priceIn' + currency);
			}
			filter.adminSort(opt.sort);
		} else
			filter.sort('date', true);

		filter.fields('id', 'linker', 'linker_location', 'location', 'status',
			'name', 'description', 'prices', 'priceprefix', 'pricelabel', 'isnew', 'isfeatured', 'isonoffer', 'ispriceonrequest',
			'pictures', 'date', 'ispublished', 'type', 'bedrooms', 'bathrooms', 'receptions', 'floors',
			'reference', 'contact', 'agent', 'descriptors', 'features');

		filter.callback(function(err, docs, count) {
			prepare_price(docs, currency);
			!isAdmin && prepare_links(docs);
			$.callback(filter.adminOutput(docs, count));
		});
	});

	// Gets a specific property
	schema.setGet(function($) {

		var options = $.options;
		var filter = NOSQL('properties').one();
		var isAdmin = F.functions.isAdminController($.controller);

		options.location && filter.where('linker_location', options.location);
		options.linker && filter.where('linker', options.linker);
		options.id && filter.where('id', options.id);
		options.template && filter.where('template', options.template);
		(!isAdmin) && filter.where('ispublished', true);
		$.id && filter.where('id', $.id);

		filter.callback(function(err, response) {

			if (err) {
				$.callback();
				return;
			}

			isAdmin && ADMIN.alert($.user, 'properties/edit', response.id);
			!isAdmin && prepare_links(response);
			F.functions.read('properties', response.id, function(err, body) {
				response.body = body;
				$.callback(response);
			});

		}, 'error-properties-404');
	});

	schema.addWorkflow('render', function($) {

		var nosql = NOSQL('properties');
		var filter = nosql.one();

		$.id && filter.where('linker', $.id);
		$.options.linker && filter.where('linker', $.options.linker);
		$.options.location && filter.where('linker_location', $.options.location);
		filter.where('ispublished', true);

		filter.callback(function(err, response) {
			if (response) {
				$.controller && ($.controller.repository.post = $.controller.repository.page = $.controller.repository.property = response);
				F.functions.read('properties', response.id, function(err, body) {
					response.body = body;
					response.body = response.body.CMSrender(response.widgets, function(body) {
						response.body = body;
						nosql.counter.hit('all').hit(response.id);
						$.callback(response);
					}, $.controller);
				});
			} else
				$.invalid('error-properties-404');
		});
	});

	// Removes a specific property
	schema.setRemove(function($) {
		var id = $.body.id;
		var user = $.user.name;

		NOSQL('properties').remove().backup(user).log('Remove: ' + id, user).where('id', id).callback(function() {
			F.functions.remove('properties', id);
			$.success();
			EMIT('wishlists.unpublish', id);
			refresh_cache();
		});
	});

	// Saves the property into the database
	schema.setSave(function($) {

		var isAdmin = F.functions.isAdminController($.controller);

		var model = $.clean();
		var user = isAdmin ? $.user.name : model.contact.email;
		var isUpdate = !!model.id;
		var nosql = NOSQL('properties');

		if (isUpdate) {
			model.dateupdated = F.datetime;
			model.adminupdated = user;
		} else {
			model.id = UID();
			model.admincreated = user;
			model.datecreated = F.datetime;
			!isAdmin && (model.ispublished = false);
		}

		!model.date && (model.date = F.datetime);

		if (isAdmin)
			model.linker = ((model.reference ? model.reference + '-' : '') + model.name).slug();
		model.stamp = new Date().format('yyyyMMddHHmm');

		var location = F.global.properties.locations.find('name', model.location);
		if (!location)
			location = prepare_location(model.location);

		model.linker_location = location.linker;
		model.location = location.name;
		model.price = undefined;

		if (model.prices && model.prices.length) {
			model.prices.forEach(function(price) {
				model['priceIn' + price.currency] = price.price;
				(!price.id) && (price.id = GUID(10));
			});
		} else {
			F.global.config.properties.currencies.forEach(function(currency) {
				model['priceIn' + currency] = 0;
			});
		}
		model.features && (model.features = model.features.quicksort());
		model.search = ((model.reference || '') + ' ' + (model.type || '') + ' ' + (model.location || '') + ' ' + (model.name || '') + ' ' + (model.features.join(' ') || '')).keywords(true, true).join(' ').max(1000);

		if (model.body) {
			model.body = U.minifyHTML(model.body);
			F.functions.write('properties', model.id + '_' + model.stamp, model.body); // backup
			F.functions.write('properties', model.id, model.body, isUpdate);
		}
		model.body = undefined;
		var waspublished = model.ispublished2;
		model.ispublished2 = undefined;
		var db = isUpdate ? nosql.modify(model).where('id', model.id).backup(user).log('Update: ' + model.id, user) : nosql.insert(model).log('Create: ' + model.id, user);
		model.ispublished2 = waspublished;

		db.callback(function() {
			$SAVE('Event', {
				type: 'properties/save',
				id: model.id,
				user: user,
				body: model.name,
				admin: isAdmin
			}, NOOP, $);
			(isUpdate && model.ispublished2 && !model.ispublished) && $SAVE('Event', {
				type: 'properties/unpublish', user: user, body: model.name, id: model.id,
				admin: isAdmin
			}, NOOP, $);

			EMIT('properties.save', model);

			$.success(model.id, user);
			refresh_cache();
		});

	});

	schema.addWorkflow('toggle', function($) {
		var user = $.user.name;
		var arr = $.options.id ? $.options.id : $.query.id.split(',');
		var unpublished = [];
		NOSQL('properties').update(function(doc) {
			doc.ispublished = !doc.ispublished;
			!doc.ispublished && unpublished.push(doc.id);
			return doc;
		}).log('Toggle: ' + arr.join(', '), user).in('id', arr).callback(function() {
			refresh_cache();
			unpublished.length && $SAVE('Event', { type: 'properties/unpublish', user: user, body: unpublished.join(', ') }, NOOP, $);
			unpublished.length && EMIT('wishlists.unpublish', unpublished);
			$.success();
		});
	});

	// Clears database
	schema.addWorkflow('clear', function($) {
		var user = $.user.name;
		NOSQL('properties').remove().backup(user).log('Clear all properties', user).callback(function() {
			F.functions.remove('properties');
			$.success();
			refresh_cache();
		});
	});


	// Ensures linker is unique
	schema.addWorkflow('unique', function($) {
		var model = $.model;

		if (!model.ispublished) {
			$.success();
			return;
		}

		var isUpdate = !!model.id;
		var oldLinker = model.linker || '';
		model.linker = ((model.reference ? model.reference + '-' : '') + model.name).slug();

		if (isUpdate && model.linker === oldLinker) {
			$.success();
			return;
		}

		schema.get({ linker: model.linker }, function(err, response) {
			if (response && !!response.id && response.id !== model.id) {
				return $.invalid('name', 'Property with the same Name and Reference already exists.');
			}
			$.success();
		});
	});

	schema.addWorkflow('search', function($) {
		var q = ($.options.search || '').keywords(true, true).join(' ');
		var status = ($.options.status || '');

		var filter = NOSQL('properties').find();
		filter.fields('linker', 'location', 'name', 'type', 'status');
		filter.where('ispublished', true);
		q && filter.search('search', q);
		status && filter.in('status', status);
		filter.take(15).callback(function(err, response) {
			prepare_links(response);
			$.callback(response);
		});
	});

	// Stats
	schema.addWorkflow('stats', function($) {
		NOSQL('properties').counter.monthly($.id || $.options.id || 'all', $.callback);
	});

	// Notify admin when property is added
	schema.addWorkflow('notify', function($) {
		var model = $.clean();
		if (!model.contact || !model.contact.email) {
			$.callback();
			return;
		}

		$.success();

		model.datecreated = F.datetime;
		// Sends email
		MAIL(F.global.config.emailcontactform, 'Property added', '=?/mails/sell', model, $.language).reply(model.contact.email, true);

		// Events
		$SAVE('Event', { type: 'property/adminnotify', user: model.contact.email, body: model.name }, NOOP, $);

	});
});

// Sets property settings
function refresh_settings() {
	$GET('PropertySettings', null, function(err, settings) {
		F.global.config.properties = settings || {};

		!settings.types && (settings.types = []);
		!settings.status && (settings.status = []);
		!settings.templates && (settings.templates = []);

		refresh();
	});
}

// Sets property dependencies
function refresh() {
	F.global.properties = {};

	var dbLocations = {};
	var dbCurrencies = {};

	var dbStatus = [];
	var dbTypes = [];
	var dbFeatures = {};

	// set currencies, default to EUR
	(F.global.config.properties.currencies || ['EUR']).forEach((item, index) => {
		var entity = prepare_currency(item);
		entity && (dbCurrencies[item] = entity);
		index == 0 && (F.global.properties.defaultCurrency = item);
	});
	F.global.properties.currencies = dbCurrencies;

	// set default locations
	(F.global.config.properties.locations || '').split('\n').quicksort().forEach(function(item) {
		if (item) {
			var location = prepare_location(item);
			if (!dbLocations[location.name])
				dbLocations[location.name] = {
					count: 0,
					hidden: 0,
					linker: location.linker,
					path: location.linker.split('/'),
					names: location.name.split('/').trim(),
					status: [],
					types: [],
					features: {}
				};
		}
	});

	// set default types
	F.global.config.properties.types.forEach(function(item) {
		if (item && dbTypes.indexOf(item) === -1)
			dbTypes.push(item);
	});

	// set default status
	F.global.config.properties.status.forEach(function(item) {
		if (item && dbStatus.indexOf(item) === -1)
			dbStatus.push(item);
	});

	var prepare = function(doc) {

		var location = doc.location;
		var status = doc.status || '';
		var type = doc.type || '';
		var features = doc.features || [];

		if (dbLocations[location]) {
			if (doc.ispublished) {
				dbLocations[location].count++;
			} else
				dbLocations[location].hidden++;
		} else {
			dbLocations[location] = {
				count: doc.ispublished ? 1 : 0,
				hidden: doc.ispublished ? 0 : 1,
				linker: doc.linker_location,
				path: doc.linker_location.split('/'),
				names: doc.location.split('/').trim(),
				status: [],
				types: [],
				features: {}
			};
		}

		if (doc.ispublished) {

			prepare_status(dbLocations[location], status);
			prepare_status(dbStatus, status);

			prepare_type(dbLocations[location], type);
			prepare_type(dbTypes, type);

			prepare_features(dbLocations[location].features, features);
			prepare_features(dbFeatures, features);
		}

	};

	NOSQL('properties').find().prepare(prepare).callback(function(err, docs, count) {

		// Prepares locations with their sublocations
		var keys = Object.keys(dbLocations);
		var locations = [];
		var locations_filter = {};
		var tmp;

		for (var i = 0, length = keys.length; i < length; i++) {
			var name = keys[i];
			var item = dbLocations[name];

			item.path.forEach(function(path, index) {
				var key = item.path.slice(0, index + 1).join('/');

				if (locations_filter[key]) {
					locations_filter[key].count += item.count;
					return;
				}

				var obj = {};
				obj.linker = key;
				obj.name = item.names.slice(0, index + 1).join(' / ');
				obj.count = item.count;
				obj.hidden = item.hidden;
				obj.text = item.names[index];
				obj.parent = item.path.slice(0, index).join('/');
				obj.level = index;
				obj.status = item.status;
				obj.types = item.types;
				obj.features = item.features;
				obj.path = item.path;

				obj.contains = function(path) {
					return (path + '/').indexOf(this.linker) !== -1;
				};

				obj.is = function(location) {
					if (!location)
						return false;
					var path = location.path;
					for (var i = 0; i < this.level + 1; i++) {
						if (path[i] !== this.path[i])
							return false;
					}
					return true;
				};
				locations_filter[key] = obj;
			});
		}

		Object.keys(locations_filter).forEach(key => locations.push(locations_filter[key]));
		locations.sort((a, b) => a.level > b.level ? 1 : a.level < b.level ? -1 : a.name.localeCompare2(b.name));

		for (var i = 0, length = locations.length; i < length; i++) {
			var item = locations[i];
			item.children = locations.where('parent', item.linker);
			item.parent = locations.find('linker', item.parent);
			item.top = tmp = item.parent;
			item.features = Object.values(item.features).quicksort('count', false).map(f => f.item);
			while (tmp) {
				tmp = locations.find('linker', item.parent);
				if (tmp)
					item.top = tmp;
			}
		}
		F.global.properties.locations = locations;
		F.global.properties.types = dbTypes.quicksort();
		F.global.properties.status = dbStatus;
		F.global.properties.features = Object.values(dbFeatures).quicksort('count', false).map(f => f.item);
	});
}

function prepare_price(items, currency) {

	var prepare = function(doc, def) {
		if (!doc || !def) return;
		for (var i = 0, length = doc.prices.length; i < length; i++) {
			var item = doc.prices[i];
			if (item.currency == def) {
				doc.price = item.price;
				break;
			}
		}
		if (!doc.price)
			doc.price = 0;
	};

	if (items instanceof Array) {
		items.forEach((doc) => prepare(doc, currency));
	} else {
		prepare(items, currency);
	}
}

function prepare_links(items) {
	var linker_detail = F.sitemap('detail', true);

	var prepare = function(item) {
		if (linker_detail)
			item.linker = linker_detail.url.format(item.linker);
		item.body = undefined;
		item.contact = undefined;
	};
	if (items instanceof Array) {
		items.forEach((doc) => prepare(doc));
	} else {
		prepare(items);
	}
}

function prepare_location(name) {

	var builder_link = [];
	var builder_text = [];
	var location = name.split('/');

	for (var i = 0, length = location.length; i < length; i++) {
		var item = location[i].trim();
		builder_link.push(item.slug());
		builder_text.push(item);
	}

	return {
		linker: builder_link.join('/'),
		name: builder_text.join(' / ')
	};
}

function prepare_features(item, items) {
	for (var i = 0, length = items.length; i < length; i++) {
		var key = items[i];
		!item[key] && (item[key] = { item: items[i], count: 0 });
		item[key].count++;
	}
}

function prepare_status(item, value) {
	if (!value) return;

	if (item instanceof Array) {
		if (item.indexOf(value) === -1)
			item.push(value);
	} else if (item.status.indexOf(value) === -1)
		item.status.push(value);
}

function prepare_type(item, value) {
	if (!value) return;

	if (item instanceof Array) {
		if (item.indexOf(value) === -1)
			item.push(value);
	} else if (item.types.indexOf(value) === -1)
		item.types.push(value);
}

function prepare_currency(item) {
	switch ((item || '').toLowerCase()) {
		case 'eur':
			return { format: '&euro; {0}', code: item, name: 'Euro', icon: 'flag-icon-pt' };
		case 'usd':
			return { format: '$ {0}', code: item, name: 'US Dollar', icon: 'flag-icon-us' };
		case 'gbp':
			return { format: '{0} &pound;', code: item, name: 'Pound Sterling', icon: 'flag-icon-gb' };
		case 'jpy':
			return { format: '&yen; {0}', code: item, name: 'Japanese Yen', icon: 'flag-icon-jp' };
		case 'czk':
			return { format: '{0} Kč', code: item, name: 'Czech Koruna', icon: 'flag-icon-cz' };
		case 'brl':
			return { format: 'R&dollar; {0}', code: item, name: 'Brazilian Real', icon: 'flag-icon-br' };
		case 'aoa':
			return { format: '{0} Kz', code: item, name: 'Kwanza', icon: 'flag-icon-ao' };
		default:
			return { format: '{0} ' + item, code: item };
	}
}

function refresh_cache() {
	setTimeout2('cache', () => F.cache.removeAll('cachecms'), 2000);
	setTimeout2('properties', refresh, 1000);
}

ON('settings', refresh_settings);


Number.prototype.currency = function(currency, decimals) {
	var formats = F.global.properties.currencies;
	if (currency && formats && formats[currency]) return formats[currency].format.format(this.format(decimals));
	return ('{0}' + currency).format(this.format(decimals));
};