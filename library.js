"use strict";

var controllers = require('./lib/controllers'),
	socketModules = module.parent.require('./socket.io/modules'),
	meta = module.parent.require('./meta');

let MongoClient = module.parent.require('mongodb').MongoClient,
	dbUrl = "mongodb://nodebb_plugin:n0debb_plugin@localhost:27017/nodebb_plugin",
	dbName = "nodebb_plugin",
	dbQueryNextPluginID = {"_key":{$regex:'^globalPluginID'}};

// init and addAdminNavigation generic functions
let plugin = {};
	
plugin.init = function(params, callback) {
	var router = params.router,
		hostMiddleware = params.middleware;
		
	// Define the routes for the view
	router.get('/admin/plugins/c4dpluginid', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
	router.get('/api/admin/plugins/c4dpluginid', controllers.renderAdminPage);
	router.get('/custompage01', hostMiddleware.buildHeader, controllers.renderCustomPage);
	
	callback();
};

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/c4dpluginid',
		icon: 'fa-tint',
		name: 'Quickstart'
	});

	callback(null, header);
};

// convert unix timestamp to date string
function tsToDate (ts){
	let date = new Date(ts);
	// Hours part from the timestamp
	let years = date.getFullYear(),
		months = date.getMonth() + 1,
		days = date.getDate(),
		hours = "0" + date.getHours(),
		minutes = "0" + date.getMinutes(),
		seconds = "0" + date.getSeconds();

	return (years + "-" + months + "-" + days + " " + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2));
}
// prepare the query string retrieving the plugin IDs belonging to the given the user ID
function PrepareQueryPluginIFromUser(userid)
{
	return {"_key":{$regex:'^pluginid:'}, $or : [{uid : String(userid)}, {uid : userid}]};
}

// prepare the query string retrieveing the user data given the user ID
function PrepareQueryUserData(userid){
	return {"_key":{$regex:'^user:'}, $or : [{uid : String(userid)}, {uid : userid}]};
}

//  execute the query
function ExecuteQuery (url, name, query, sortkey, sortval, callback){
	MongoClient.connect(url, function(err, database){
		if (err) throw err;
		if (sortkey.length == 0)
		{
			console.log("no sorting");
			// no sorting
			database.db(name).collection("objects").find(query).toArray(function(err, result) {
				if (err) throw err;
				database.close();
				console.log(result);
				callback(result);
			});
		}
		else{
			// sorting by sortKey and sortValue
			database.db(name).collection("objects").find(query).sort(sortkey, sortval).toArray(function(err, result) {
				if (err) throw err;
				database.close();
				console.log(result);
				callback(result);
			});			
		}
	});
}

// execute the pluginID object insert and increment the global counter
function ExecuteIncrementAndInsert(url, name, insvalue, callback){
	MongoClient.connect(url, function(err, database){
		if (err) throw err;
		let dbCollection = database.db(name).collection("objects");
		dbCollection.update({_key : "globalPluginID"}, { $inc : { nextID : 1 }, $set : { lastCreated : insvalue.timestamp } }, function(err, result) {
			if (err) throw err;
			//console.log("nextID incremented");
			dbCollection.insertOne(insvalue, function(err, result) {
				if (err) throw err;
				//console.log("pluginID inserted");
				database.close(); 
				callback(result);
			});
		});
	});	
}

// onLoadPage function override for socket module
socketModules.onLoadPage = function(socket, callback) {
	if (socket.uid === 0){
		callback (null, "<b>Wrong route!</b><br><p>Plugin ID generation is available to registered-only members.</p>");
	}
	else{

		// try to retrieve c4dpluginid ACP settings
		meta.settings.get('c4dpluginid', function(err, settings){
			if (err) throw err;

			// try to retrieve the information about the current logged user
			ExecuteQuery(dbUrl, dbName, PrepareQueryUserData(socket.uid), "", 1, function(userData){
				
				// retrieve the current user id
				let userID = Number(userData[0].uid),
					userName = userData[0].username,
					userWebsite = userData[0].website;

				let HTMLResObj = { domainInfo: [], pluginidInfo: ""};

				if (settings.notifydomain == "on")
				{
					// check if website has been set in the user profile
					if (userWebsite.length != 0){

						let websiteArray = userWebsite.split(".");
						// check if the website is  compliant which means it should be
						// composed at least by three parts like <part1>.<part2>.<part3> and <part1> == "www"
						if (websiteArray.length >= 3 && websiteArray[0] == "www")
						{
							// use data from website
							HTMLResObj.domainInfo.push("MAXON API suggested domain space")
							HTMLResObj.domainInfo.push("The suggested MAXON API domain space, based on your profile, is: <b>"+websiteArray[2]+"."+websiteArray[1]+".*</b>");
						}
						else
						{
							// use default value found in ACP
							HTMLResObj.domainInfo.push("MAXON API suggested domain space")
							HTMLResObj.domainInfo.push("The suggested MAXON API domain space, based on your profile, is: <b>"+settings.revdomainspace+userName+".*</b>"); // To be changed
						}
					}
					else
					{
						// use default value found in ACP
						HTMLResObj.domainInfo.push("MAXON API suggested domain space")
						HTMLResObj.domainInfo.push("The suggested MAXON API domain space, based on your profile, is: <b>"+settings.revdomainspace+userName+".*</b>"); // To be changed
					}
				}

				// try to execute the query to retrieve all the plugin registered by the current user
				ExecuteQuery(dbUrl, dbName, PrepareQueryPluginIFromUser(userID), "timestamp", -1, function(pluginIDArray){	
					
					HTMLResObj.pluginidInfo = "<p>List of plugin ID assigned to <b>"+userName+"</b>:</p>";
					HTMLResObj.pluginidInfo +="<table width=500><tr><th width=\"15%\">Plugin ID</th><th width=\"60%\">Associated Label</th><th width=\"25%\">Creation Date</th></tr>";
					
					// process the queryRes to return the data on the client
					for (let i = 0; i < pluginIDArray.length; i++)
					{
						let pluginIDEntry = pluginIDArray[i];
						HTMLResObj.pluginidInfo += "<tr><td width=\"15%\">"+pluginIDEntry.pluginid+"</td><td width=\"60%\">"+pluginIDEntry.label+"</td><td width=\"25%\">"+tsToDate(pluginIDEntry.timestamp)+"</td></tr>";
					}

					HTMLResObj.pluginidInfo += "</table>";

					callback(null, HTMLResObj);
				});
			});
		});
	}
};

// onGenerateID function override for socket module
socketModules.onGenerateID = function(socket, data, callback){

	if (socket.uid === 0){
		callback (null, "<b>Wrong route!</b><br><p>Plugin ID generation is available to registered-only members.</p>");
	}
	else{

		// remove white spaces
		let pluginLabel = data.values[0].replace(/\s/g,'');
		
		// check for the validity of the label used for the plugin ID generation
		if (pluginLabel.length === 0 || !pluginLabel || /^\s*$/.test(pluginLabel)){
			callback (null, "<b>Plugin ID generation failed!</b><br><p>Provide a valid string for the label.</p>");
		}
		else{
			
			// try to retrieve c4dpluginid ACP settings
			meta.settings.get('c4dpluginid', function(err, settings){
				if (err) throw err;

				// try to retrieve the information about the current logged user
				ExecuteQuery(dbUrl, dbName, PrepareQueryUserData(socket.uid), "", 1, function(userData){

					// retrieve the current user id
					let userID = Number(userData[0].uid),
						userName = userData[0].username,
						userWebsite = userData[0].website;
					
					let HTMLResObj = { domainInfo: [], pluginidInfo: ""};

					if (settings.notifydomain == "on")
					{
						// check if website has been set in the user profile
						if (userWebsite.length != 0){
	
							let websiteArray = userWebsite.split(".");
							// check if the website is  compliant which means it should be
							// composed at least by three parts like <part1>.<part2>.<part3> and <part1> == "www"
							if (websiteArray.length >= 3 && websiteArray[0] == "www")
							{
								// use data from website
								HTMLResObj.domainInfo.push("MAXON API suggested domain space")
								HTMLResObj.domainInfo.push("The suggested MAXON API domain space, based on your profile, is:<b>"+websiteArray[2]+"."+websiteArray[1]+".*</b>");
							}
							else
							{
								// use default value found in ACP
								HTMLResObj.domainInfo.push("MAXON API suggested domain space")
								HTMLResObj.domainInfo.push("The suggested MAXON API domain space, based on your profile, is:<b>"+settings.revdomainspace+userName+".*</b>"); // To be changed
							}
						}
						else
						{
							// use default value found in ACP
							HTMLResObj.domainInfo.push("MAXON API suggested domain space")
							HTMLResObj.domainInfo.push("The suggested MAXON API domain space, based on your profile, is:<b>"+settings.revdomainspace+userName+".*</b>"); // To be changed
						}
					}

					// try to execute the query to check the next-to-be-used plugin ID
					ExecuteQuery(dbUrl, dbName, dbQueryNextPluginID, "", 1, function(queryRes){	
						
						// allocate the next-to-be-used plugin ID
						let pluginidObj = {
							_key : "pluginid:"+String(queryRes[0].nextID),
							pluginid : queryRes[0].nextID,
							uid : userID,
							label : pluginLabel,
							timestamp : Date.now()
							};
						
						// try to execute the insert of the new pluginid
						ExecuteIncrementAndInsert(dbUrl, dbName, pluginidObj, function(insertRes){

							// try to execute the query to retrieve all the plugin registered by the current user
							ExecuteQuery(dbUrl, dbName, PrepareQueryPluginIFromUser(userID), "timestamp", -1, function(pluginIDArray){	
							
								HTMLResObj.pluginidInfo = "<p>List of plugin ID assigned to <b>"+userName+"</b>:</p>";
								HTMLResObj.pluginidInfo +="<table width=500><tr><th width=\"15%\">Plugin ID</th><th width=\"60%\">Associated Label</th><th width=\"25%\">Creation Date</th></tr>";
								
								// process the queryRes to return the data on the client
								for (let i = 0; i < pluginIDArray.length; i++)
								{
									let pluginIDEntry = pluginIDArray[i];
									HTMLResObj.pluginidInfo += "<tr><td width=\"15%\">"+pluginIDEntry.pluginid+"</td><td width=\"60%\">"+pluginIDEntry.label+"</td><td width=\"25%\">"+tsToDate(pluginIDEntry.timestamp)+"</td></tr>";
								}

								HTMLResObj.pluginidInfo += "</table>"
								callback(null, HTMLResObj);
							});
						});
					});
				});
			});
		}
	}
};

module.exports = plugin;