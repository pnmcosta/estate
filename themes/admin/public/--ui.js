COMPONENT('resource', function(self) {

	self.readonly();
	self.blind();

	self.init = function() {
		window.RESOURCEDB = {};
		window.RESOURCE = function(name, def) {
			return RESOURCEDB[name] || def || name;
		};
	};

	self.download = function(url, callback) {
		AJAX('GET ' + url, function(response) {
			if (!response) { 
				callback && callback();
				return;
			}

			if (typeof(response) !== 'string')
				response = response.toString();
			self.prepare(response);
			callback && callback();
		});
	};

	self.prepare = function(value) {
		var w = window;
		value.split('\n').forEach(function(line) {

			var clean = line.trim();
			if (clean.substring(0, 2) === '//')
				return;

			var index = clean.indexOf(':');
			if (index === -1)
				return;

			var key = clean.substring(0, index).trim();
			var value = clean.substring(index + 1).trim();

			w.RESOURCEDB[key] = value;
		});
		return self;
	};

	self.make = function() {
		var el = self.find('script');
		self.prepare(el.html());
		el.remove();
	};
});

COMPONENT('tree', 'selected:selected;autoreset:false', function(self, config) {

	var cache = null;
	var counter = 0;
	var expanded = {};
	var selindex = -1;

	self.template = Tangular.compile('<div class="item{{ if children }} expand{{ fi }}" title="{{ name }}" data-index="{{ $pointer }}"><i class="fa {{ if children }}ui-tree-folder{{ else }}fa-file-o{{ fi }}"></i>{{ name }}</div>');
	self.readonly();

	self.make = function() {
		self.aclass('ui-tree');
		self.event('click', '.item', function() {
			var el = $(this);
			var index = +el.attr('data-index');
			self.select(index);
		});
	};

	self.select = function(index) {
		var cls = config.selected;
		var el = self.find('[data-index="{0}"]'.format(index));
		if (el.hclass('expand')) {
			var parent = el.parent();
			parent.tclass('show');
			var is = expanded[index] = parent.hclass('show');
			config.exec && EXEC(config.exec, cache[index], true, is);
		} else {
			!el.hclass(cls) && self.find('.' + cls).rclass(cls);
			el.aclass(cls);
			config.exec && EXEC(config.exec, cache[index], false);
			selindex = index;
		}
	};

	self.unselect = function() {
		var cls = config.selected;
		self.find('.' + cls).rclass(cls);
	};

	self.clear = function() {
		expanded = {};
		selindex = -1;
	};

	self.expand = function(index) {
		if (index == null) {
			self.find('.expand').each(function() {
				$(this).parent().aclass('show');
			});
		} else {
			self.find('[data-index="{0}"]'.format(index)).each(function() {
				var el = $(this);
				if (el.hclass('expand')) {
					// group
					el.parent().aclass('show');
				} else {
					// item
					while (true) {
						el = el.closest('.children').prev();
						if (!el.hclass('expand'))
							break;
						el.parent().aclass('show');
					}
				}
			});
		}
	};

	self.collapse = function(index) {
		if (index == null) {
			self.find('.expand').each(function() {
				$(this).parent().rclass('show');
			});
		} else {
			self.find('[data-index="{0}"]'.format(index)).each(function() {
				var el = $(this);
				if (el.hclass('expand')) {
					// group
					el.parent().rclass('show');
				} else {
					// item
					while (true) {
						el = el.closest('.children').prev();
						if (!el.hclass('expand'))
							break;
						el.parent().rclass('show');
					}
				}
			});
		}
	};

	self.renderchildren = function(builder, item, level) {
		builder.push('<div class="children children{0}" data-level="{0}">'.format(level));
		item.children.forEach(function(item) {
			counter++;
			item.$pointer = counter;
			cache[counter] = item;
			builder.push('<div class="node{0}">'.format(expanded[counter] && item.children ? ' show' : ''));
			builder.push(self.template(item));
			item.children && self.renderchildren(builder, item, level + 1);
			builder.push('</div>');
		});
		builder.push('</div>');
	};

	self.reset = function() {
		var cls = config.selected;
		self.find('.' + cls).rclass(cls);
	};

	self.first = function() {
		cache.first && self.select(cache.first.$pointer);
	};

	self.setter = function(value) {

		config.autoreset && self.clear();
		var builder = [];

		counter = 0;
		cache = {};

		value && value.forEach(function(item) {
			counter++;
			item.$pointer = counter;
			cache[counter] = item;
			builder.push('<div class="node{0}">'.format(expanded[counter] && item.children ? ' show' : '') + self.template(item));
			if (item.children)
				self.renderchildren(builder, item, 1);
			else if (!cache.first)
				cache.first = item;
			builder.push('</div>');
		});

		self.html(builder.join(''));

		if (selindex !== -1)
			self.select(selindex);
		else
			config.first !== false && cache.first && setTimeout(self.first, 100);
	};
});

COMPONENT('inlineform', 'icon:circle-o', function(self, config) {

	var W = window;
	var dw = 300;

	if (!W.$$inlineform) {
		W.$$inlineform = true;
		$(document).on('click', '.ui-inlineform-close', function() {
			SETTER('inlineform', 'hide');
		});
		$(window).on('resize', function() {
			SETTER('inlineform', 'hide');
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			EXEC(config.submit, self);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && EXEC(config.cancel, self);
		self.hide();
	};

	self.hide = function() {
		if (self.hclass('hidden'))
			return;
		self.release(true);
		self.aclass('hidden');
		self.find('.ui-inlineform').rclass('ui-inlineform-animate');
	};

	self.icon = function(value) {
		var el = this.rclass2('fa');
		value.icon && el.aclass('fa fa-' + value.icon);
	};

	self.make = function() {

		$(document.body).append('<div id="{0}" class="hidden ui-inlineform-container" style="max-width:{1}"><div class="ui-inlineform"><i class="fa fa-caret-up ui-inlineform-arrow"></i><div class="ui-inlineform-title" data-bind="@config__html span:value.title__change .ui-inlineform-icon:@icon"><button class="ui-inlineform-close"><i class="fa fa-times"></i></button><i class="ui-inlineform-icon"></i><span></span></div></div></div>'.format(self.ID, (config.width || dw) + 'px', self.path));

		var el = $('#' + self.ID);
		el.find('.ui-inlineform')[0].appendChild(self.dom);
		self.rclass('hidden');
		self.replace(el);

		self.find('button').on('click', function() {
			var el = $(this);
			switch (this.name) {
				case 'submit':
					if (el.hclass('exec'))
						self.hide();
					else
						self.submit(self.hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]')[0].disabled && setTimeout(function() {
				self.submit(self.hide);
			}, 800);
		});
	};

	self.toggle = function(el, position, offsetX, offsetY) {
		if (self.hclass('hidden'))
			self.show(el, position, offsetX, offsetY);
		else
			self.hide();
	};

	self.show = function(el, position, offsetX, offsetY) {

		SETTER('inlineform', 'hide');

		self.rclass('hidden');
		self.release(false);

		var offset = el.offset();
		var w = config.width || dw;
		var ma = 35;

		if (position === 'right') {
			offset.left -= w - el.width();
			ma = w - 35;
		} else if (position === 'center') {
			ma = (w / 2);
			offset.left -= ma - (el.width() / 2);
			ma -= 12;
		}

		offset.top += el.height() + 10;

		if (offsetX)
			offset.left += offsetX;

		if (offsetY)
			offset.top += offsetY;

		config.reload && EXEC(config.reload, self);
		config.default && DEFAULT(config.default, true);

		self.find('.ui-inlineform-arrow').css('margin-left', ma);
		self.css(offset);

		var el = self.find('input[type="text"],select,textarea');
		!isMOBILE && el.length && el[0].focus();

		setTimeout(function() {
			self.find('.ui-inlineform').aclass('ui-inlineform-animate');
		}, 300);
	};
});
COMPONENT('textboxtags', function(self, config) {

	var isString = false;
	var container, content = null;
	var refresh = false;
	var W = window;

	if (!W.$textboxtagstemplate)
		W.$textboxtagstemplate = Tangular.compile('<div class="ui-textboxtags-tag" data-name="{{ name }}">{{ name }}<i class="fa fa-times"></i></div>');

	var template = W.$textboxtagstemplate;

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.state(1, 1);
				self.find('input').prop('disabled', value);
				break;
			case 'required':
				self.tclass('ui-textboxtags-required', value);
				self.state(1, 1);
				break;
			case 'icon':
				var fa = self.find('.ui-textboxtags-label > i');
				if (fa.length && value)
					fa.rclass().aclass('fa fa-' + value);
				else
					redraw = true;
				break;

			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
			case 'height':
				self.find('.ui-textboxtags-values').css('height', value);
				break;
			case 'label':
				redraw = true;
				break;
			case 'type':
				self.type = value;
				isString = self.type === 'string';
				break;
		}

		redraw && setTimeout2('redraw' + self.id, function() {
			refresh = true;
			container.off();
			self.redraw();
			self.refresh();
		}, 100);

	};

	self.redraw = function() {
		var label = config.label || content;
		var html = '<div class="ui-textboxtags-values"' + (config.height ? ' style="min-height:' + config.height + 'px"' : '') + '><input type="text" placeholder="' + (config.placeholder || '') + '" /></div>';

		isString = self.type === 'string';

		if (content.length) {
			self.html('<div class="ui-textboxtags-label">{0}{1}:</div><div class="ui-textboxtags">{2}</div>'.format((config.icon ? '<i class="fa fa-' + config.icon + '"></i> ' : ''), label, html));
		} else {
			self.aclass('ui-textboxtags');
			self.html(html);
		}

		container = self.find('.ui-textboxtags-values');
		config.disabled && self.reconfigure('disabled:true');
	};

	self.make = function() {

		self.aclass('ui-textboxtags-container');
		config.required && self.aclass('ui-textboxtags-required');
		content = self.html();
		self.type = config.type || '';
		self.redraw();

		self.event('click', '.fa-times', function(e) {

			if (config.disabled)
				return;

			e.preventDefault();
			e.stopPropagation();

			var el = $(this);
			var arr = self.get();

			if (isString)
				arr = self.split(arr);

			if (!arr || !(arr instanceof Array) || !arr.length)
				return;

			var index = arr.indexOf(el.parent().attr('data-name'));
			if (index === -1)
				return;

			arr.splice(index, 1);
			self.set(isString ? arr.join(', ') : arr);
			self.change(true);
		});

		self.event('click', function() {
			!config.disabled && self.find('input').focus();
		});

		self.event('focus', 'input', function() {
			config.focus && EXEC(config.focus, $(this), self);
		});

		self.event('keydown', 'input', function(e) {

			if (config.disabled)
				return;

			if (e.which === 8) {
				if (this.value)
					return;
				var arr = self.get();
				if (isString)
					arr = self.split(arr);
				if (!arr || !(arr instanceof Array) || !arr.length)
					return;
				arr.pop();
				self.set(isString ? arr.join(', ') : arr);
				self.change(true);
				return;
			}

			if (e.which !== 13)
				return;

			e.preventDefault();

			if (!this.value)
				return;

			var arr = self.get();
			var value = this.value;

			if (config.uppercase)
				value = value.toUpperCase();
			else if (config.lowercase)
				value = value.toLowerCase();

			if (isString)
				arr = self.split(arr);

			if (!(arr instanceof Array))
				arr = [];

			if (arr.indexOf(value) === -1)
				arr.push(value);
			else
				return;

			this.value = '';
			self.set(isString ? arr.join(', ') : arr);
			self.change(true);
		});
	};

	self.split = function(value) {
		if (!value)
			return [];
		var arr = value.split(',');
		for (var i = 0, length = arr.length; i < length; i++)
			arr[i] = arr[i].trim();
		return arr;
	};

	self.setter = function(value) {

		if (!refresh && NOTMODIFIED(self.id, value))
			return;

		refresh = false;
		container.find('.ui-textboxtags-tag').remove();

		if (!value || !value.length)
			return;

		var arr = isString ? self.split(value) : value;
		var builder = '';
		for (var i = 0, length = arr.length; i < length; i++)
			builder += template({ name: arr[i] });

		container.prepend(builder);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.tclass('ui-textboxtags-invalid', invalid);
	};
});

COMPONENT('pictures2', function() {

	var self = this;

	self.skip = false;
	self.readonly();

	self.make = function() {
		self.aclass('ui-pictures');
	};

	self.setter = function(value) {

		if (typeof(value) === 'string')
			value = value.split(',');

		if (self.skip) {
			self.skip = false;
			return;
		}

		self.find('.fa,img').unbind('click');

		if (!(value instanceof Array) || !value.length) {
			self.empty();
			return;
		}

		var builder = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var url = value[i];
			url && builder.push('<div data-url="{0}" class="col-xs-3 col-lg-2 m"><span class="fa fa-times"></span><img src="/download/{0}" class="img-responsive" alt="" /></div>'.format(url));
		}

		self.html(builder);

		this.element.find('.fa').bind('click', function() {
			var url = [];
			$(this).parent().remove();

			self.find('div').each(function() {
				url.push($(this).attr('data-url'));
			});

			self.skip = true;
			self.set(url);
		});

		this.element.find('img').bind('click', function() {

			var selected = self.find('.selected');
			var el = $(this);

			el.toggleClass('selected');

			if (!selected.length)
				return;

			var parent1 = el.parent();
			var parent2 = selected.parent();
			var url1 = parent1.attrd('url');
			var url2 = parent2.attrd('url');
			var arr = self.get();

			var index1 = arr.indexOf(url1);
			var index2 = arr.indexOf(url2);

			arr[index1] = url2;
			arr[index2] = url1;

			parent1.attrd('url', url2);
			parent2.attrd('url', url1);

			var img1 = parent1.find('img');
			var img2 = parent2.find('img');
			var src1 = img1.attr('src');

			img1.attr('src', img2.attr('src'));
			img2.attr('src', src1);

			setTimeout(function() {
				self.skip = true;
				img1.rclass('selected');
				img2.rclass('selected');
				self.change(true);
				self.set(arr);
			}, 200);
		});
	};
});


COMPONENT('textboxlist', 'maxlength:100;required:false;error:You reach the maximum limit', function (self, config) {

	var container, content;
	var empty = {};
	var skip = false;
	var cempty = 'empty';
	var crequired = 'required';
	var helper = null;

	self.setter = null;
	self.getter = null;
	self.nocompile && self.nocompile();

	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}"{{ if disabled}} disabled="disabled"{{ fi }} value="{{ value }}" /></div></div>');

	self.configure = function (key, value, init, prev) {
		if (init)
			return;

		var redraw = false;
		switch (key) {
			case 'disabled':
				self.tclass(crequired, value);
				self.find('input').prop('disabled', true);
				empty.disabled = value;
				self.reset();
				break;
			case 'maxlength':
				empty.max = value;
				self.find('input').prop(key, value);
				break;
			case 'placeholder':
				empty.placeholder = value;
				self.find('input').prop(key, value);
				break;
			case 'label':
				redraw = true;
				break;
			case 'icon':
				if (value && prev)
					self.find('i').rclass().aclass(value);
				else
					redraw = true;
				break;
		}

		if (redraw) {
			skip = false;
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function () {

		var icon = '';
		var html = config.label || content;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);

		empty.value = '';
		self.html((html ? '<div class="ui-textboxlist-label{2}">{1}{0}:</div>'.format(html, icon, config.required ? ' ui-textboxlist-label-required' : '') : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');
	};

	self.make = function () {

		empty.max = config.max;
		empty.placeholder = config.placeholder;
		empty.value = '';
		empty.disabled = config.disabled;

		if (config.disabled)
			self.aclass('ui-disabled');

		content = self.html();
		self.aclass('ui-textboxlist');
		self.redraw();

		self.event('click', '.fa-times', function () {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			helper != null && helper.remove();
			helper = null;

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;

			arr.splice(index, 1);

			self.tclass(cempty, arr.length === 0);

			self.tclass(crequired, config.required && arr.length === 0);

			skip = true;
			SET(self.path, arr, 2);
			self.change(true);
		});

		self.event('change keypress blur', 'input', function (e) {

			if ((e.type === 'keypress' && e.which !== 13) || config.disabled)
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base');
			var len = base.length > 0;

			if (len && e.type === 'change')
				return;

			var raw = self.get();

			if (config.limit && len && raw.length >= config.limit) {
				if (!helper) {
					base.after('<div class="ui-textboxlist-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
					helper = container.closest('.ui-textboxlist').find('.ui-textboxlist-helper');
				}
				return;
			}

			if (len) {

				if (!raw || raw.indexOf(value) === -1)
					self.push(value);

				this.value = '';
				self.change(true);
				return;
			}

			skip = true;

			container.find('input').each(function () {

				var temp = this.value.trim();

				if (arr.indexOf(temp) === -1)
					arr.push(temp);
				else
				 	skip = false;
			});

			SET(self.path, arr, 2);
			self.change(true);
		});
	};

	self.setter = function (value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			self.aclass(cempty);
			config.required && self.aclass(crequired);
			container.empty();
			return;
		}

		self.rclass(cempty);
		self.rclass(crequired);
		var builder = [];

		value.forEach(function (item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};

	self.validate = function(value, init) {

		if (init)
			return true;

		var valid = !config.required;
		var items = container.children();

		if (!value || !value.length)
			return valid;

		value.forEach(function (item, i) {
			!item && (item = '');
			switch (config.type) {
				case 'email':
					valid = item.isEmail();
					break;
				case 'url':
					valid = item.isURL();
					break;
				case 'currency':
				case 'number':
					valid = item > 0;
					break;
				case 'date':
					valid = item instanceof Date && !isNaN(item.getTime());
					break;
				default:
					valid = item.length > 0;
					break;
			}
			items.eq(i).tclass('ui-textboxlist-item-invalid', !valid);
		});

		return valid;
	};

});

COMPONENT('crop2', 'dragdrop:true;format:{0}', function(self, config) {

	var canvas, context;
	var img = new Image();
	var can = false;
	var is = false;
	var zoom = 100;
	var current = { x: 0, y: 0 };
	var offset = { x: 0, y: 0 };
	var cache = { x: 0, y: 0, zoom: 0 };
	var width = 0;

	self.bindvisible();
	self.novalidate();
	self.nocompile && self.nocompile();
	self.getter = null;

	img.crossOrigin = 'anonymous';

	img.onload = function() {
		can = true;
		zoom = 100;

		var width = config.width;
		var height = config.height;

		var nw = (img.width / 2);
		var nh = (img.height / 2);

		if (img.width > width) {
			var p = (width / (img.width / 100));
			zoom -= zoom - p;
			nh = ((img.height * (p / 100)) / 2);
			nw = ((img.width * (p / 100)) / 2);
		}

		// centering
		cache.x = current.x = (width / 2) - nw;
		cache.y = current.y = (height / 2) - nh;
		cache.zoom = zoom;
		self.redraw();
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'width':
			case 'height':
				cache.x = current.x = cache.y = current.y = 0;
				setTimeout2(self._id + 'resize', self.redraw, 50);
				break;
		}
	};

	self.output = function(type) {
		var canvas2 = document.createElement('canvas');
		var ctx2 = canvas2.getContext('2d');

		canvas2.width = config.width;
		canvas2.height = config.height;

		ctx2.clearRect(0, 0, canvas2.width, canvas2.height);

		if (config.background) {
			ctx2.fillStyle = config.background;
			ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
		}

		var w = img.width;
		var h = img.height;

		w = ((w / 100) * zoom);
		h = ((h / 100) * zoom);

		ctx2.drawImage(img, current.x || 0, current.y || 0, w, h);
		return type ? canvas2.toDataURL(type) : !config.background && self.isTransparent(canvas2) ? canvas2.toDataURL('image/png') : canvas2.toDataURL('image/jpeg');
	};

	self.make = function() {
		self.aclass('ui-crop');
		self.append('<input type="file" style="display:none" accept="image/*" /><ul><li data-type="upload"><span class="fa fa-folder"></span></li><li data-type="plus"><span class="fa fa-plus"></span></li><li data-type="refresh"><span class="fa fa-refresh"></span></li><li data-type="minus"><span class="fa fa-minus"></span></li></ul><div>0x0</div><canvas width="200" height="100"></canvas>');

		canvas = self.find('canvas')[0];
		context = canvas.getContext('2d');

		self.event('click', 'li', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var type = $(this).attr('data-type');

			switch (type) {
				case 'upload':
					self.find('input').trigger('click');
					break;
				case 'plus':
					zoom += 3;
					if (zoom > 300)
						zoom = 300;
					current.x -= 3;
					current.y -= 3;
					self.redraw();
					break;
				case 'minus':
					zoom -= 3;
					if (zoom < 3)
						zoom = 3;
					current.x += 3;
					current.y += 3;
					self.redraw();
					break;
				case 'refresh':
					zoom = cache.zoom;
					self.redraw();
					break;
			}

		});

		self.find('input').on('change', function() {
			var file = this.files[0];
			self.load(file);
			this.value = '';

		});

		$(canvas).on('mousedown', function(e) {

			if (self.disabled || !can)
				return;

			is = true;
			var rect = canvas.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;
			offset.x = x - current.x;
			offset.y = y - current.y;
		});

		config.dragdrop && $(canvas).on('dragenter dragover dragexit drop dragleave', function(e) {

			if (self.disabled)
				return;

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					self.rclass('ui-crop-dragdrop');
					break;
				case 'dragenter':
				case 'dragover':
					self.aclass('ui-crop-dragdrop');
					return;
				case 'dragexit':
				case 'dragleave':
				default:
					self.rclass('ui-crop-dragdrop');
					return;
			}

			var files = e.originalEvent.dataTransfer.files;
			files[0] && self.load(files[0]);
		});

		self.load = function(file) {
			self.getOrientation(file, function(orient) {
				var reader = new FileReader();
				reader.onload = function() {
					if (orient < 2) {
						img.src = reader.result;
						setTimeout(function() {
							self.change(true);
						}, 500);
					} else {
						SETTER('loading', 'show');
						self.resetOrientation(reader.result, orient, function(url) {
							SETTER('loading', 'hide', 500);
							img.src = url;
							self.change(true);
						});
					}
				};
				reader.readAsDataURL(file);
			});
		};

		self.event('mousemove mouseup', function(e) {

			if (e.type === 'mouseup') {
				is && self.change();
				is = false;
				return;
			}

			if (self.disabled || !can || !is)
				return;

			var rect = canvas.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;
			current.x = x - offset.x;
			current.y = y - offset.y;
			self.redraw();
		});
	};

	self.redraw = function() {

		var ratio = width < config.width ? width / config.width : 1;

		canvas.width = width < config.width ? width : config.width;
		canvas.height = width < config.width ? (config.height / config.width) * width : config.height;

		var w = img.width;
		var h = img.height;

		w = ((w / 100) * zoom);
		h = ((h / 100) * zoom);

		context.clearRect(0, 0, canvas.width, canvas.height);

		if (config.background) {
			context.fillStyle = config.background;
			context.fillRect(0, 0, canvas.width, canvas.height);
		}

		self.find('div').html(config.width + 'x' + config.height);
		context.drawImage(img, (current.x || 0) * ratio, (current.y || 0) * ratio, w * ratio, h * ratio);
	};

	self.setter = function(value) {
		self.width(function(w) {
			width = w;
			if (value)
				img.src = config.format.format(value);
			else
				self.redraw();
		});
	};

	self.isTransparent = function(canvas) {
		var id = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
		for (var i = 0, length = id.data.length; i < length; i += 4) {
			if (id.data[i + 3] !== 255)
				return true;
		}
		return false;
	};

	// http://stackoverflow.com/a/32490603
	self.getOrientation = function(file, callback) {
		var reader = new FileReader();
		reader.onload = function(e) {
			var view = new DataView(e.target.result);
			if (view.getUint16(0, false) != 0xFFD8)
				return callback(-2);
			var length = view.byteLength;
			var offset = 2;
			while (offset < length) {
				var marker = view.getUint16(offset, false);
				offset += 2;
				if (marker == 0xFFE1) {
					if (view.getUint32(offset += 2, false) != 0x45786966)
						return callback(-1);
					var little = view.getUint16(offset += 6, false) == 0x4949;
					offset += view.getUint32(offset + 4, little);
					var tags = view.getUint16(offset, little);
					offset += 2;
					for (var i = 0; i < tags; i++)
						if (view.getUint16(offset + (i * 12), little) == 0x0112)
							return callback(view.getUint16(offset + (i * 12) + 8, little));
				} else if ((marker & 0xFF00) != 0xFF00)
					break;
				else
					offset += view.getUint16(offset, false);
			}
			return callback(-1);
		};
		reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
	};

	self.resetOrientation = function(src, srcOrientation, callback) {
		var img = new Image();
		img.onload = function() {
			var width = img.width;
			var height = img.height;
			var canvas = document.createElement('canvas');
			var ctx = canvas.getContext('2d');

			// set proper canvas dimensions before transform & export
			if (4 < srcOrientation && srcOrientation < 9) {
				canvas.width = height;
				canvas.height = width;
			} else {
				canvas.width = width;
				canvas.height = height;
			}
			switch (srcOrientation) {
				case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
				case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
				case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
				case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
				case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
				case 7: ctx.transform(0, -1, -1, 0, height, width); break;
				case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
			}
			ctx.drawImage(img, 0, 0);
			callback(canvas.toDataURL());
		};
		img.src = src;
	};

	self.clear = function() {
		canvas && context && context.clearRect(0, 0, canvas.width, canvas.height);
	};
});