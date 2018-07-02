'use strict';

var Controllers = {};

Controllers.renderAdminPage = function (req, res, next) {
	/*
		Make sure the route matches your path to template exactly.

		If your route was:
			myforum.com/some/complex/route/
		your template should be:
			templates/some/complex/route.tpl
		and you would render it like so:
			res.render('some/complex/route');
	*/

	res.render('admin/plugins/c4dpluginid', {});
};



Controllers.renderCustomPage = function (req, res, next) {
	// in case sombody attempts to reach the page directly settings the address
	// plugincafe.maxon.net/c4dpluginid the engine redirect to the login page

	res.redirect('../login');
};


module.exports = Controllers;