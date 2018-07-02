'use strict';
/* globals $, app, socket */

define('admin/plugins/c4dpluginid', ['settings'], function(Settings) {

	var ACP = {};

	ACP.init = function() {
		Settings.load('c4dpluginid', $('.c4dpluginid-settings'));

		$('#save').on('click', function() {
			Settings.save('c4dpluginid', $('.c4dpluginid-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'c4dpluginid-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});