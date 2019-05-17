CONFIG('table.propertiesdata', 'id:string|body:string|datecreated:date');
CONFIG('table.wishlistdata', 'id:string|property:string|dateadded:date');
TABLE('propertiesdata').memory(1);
TABLE('wishlistdata').memory(1);

GETSCHEMA('Settings', function(err, schema) {
	schema.addHook('dependencies', function($) {
		var config = F.global.config.properties;
		var settings = F.global.properties;
		$.model.properties = {};
		var obj = $.model.properties;
		(config) && (obj.templates = config.templates);
		(config) && (obj.currencies = config.currencies);
		obj.types = settings.types;
		obj.status = settings.status;
		obj.defaultCurrency = settings.defaultCurrency;
		obj.features = settings.features;
		obj.locations = [];
		for (var i = 0, length = settings.locations.length; i < length; i++) {
			var item = settings.locations[i];
			obj.locations.push({ name: item.name, level: item.level, count: item.count, linker: item.linker, features: item.features });
		}
		obj.locations.quicksort('name');

		$.callback();
	});
});

F.functions.isAdminController = function(ctrl) {
	return ctrl && ctrl.route && ctrl.route.groups && ctrl.route.groups.admin;
};

ON('files.clear', function(databases) {
	databases.push(F.path.databases('properties.nosql'));
	databases.push(F.path.databases('propertiesdata.table'));
	databases.push(F.path.databases('wishlistdata.table'));
});