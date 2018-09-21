"use strict";

var controllers = require('./lib/controllers'),
	socketModules = module.parent.require('./socket.io/modules'),
	meta = module.parent.require('./meta');

let MongoClient = module.parent.require('mongodb').MongoClient,
	dbUrl = "mongodb://nodebb:n0debb@localhost:27017/nodebb",
	dbName = "nodebb",
	dbQueryNextPluginID = {"_key":{$regex:'^globalPluginID'}};

// init and addAdminNavigation generic functions
let plugin = {};
	
plugin.init = function(params, callback) {
	var router = params.router,
		hostMiddleware = params.middleware;
		
	// Define the routes for the view
	router.get('/admin/plugins/c4dpluginid', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
	router.get('/api/admin/plugins/c4dpluginid', controllers.renderAdminPage);
	router.get('/c4dpluginid_cp', hostMiddleware.buildHeader, controllers.renderCustomPage);
	
	callback();
};

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/c4dpluginid',
		icon: 'fa-tint',
		name: 'C4D Plugin ID'
	});

	callback(null, header);
};

// check label correctness and validity
function VerifyLabel(label){
	// strip out all HTML-tags
	let verifiedLabel = label.replace(/<(.|\n)*?>/g, '');

	// strip out all non alphanumeric characters potentially causes of MongoDB injections
	verifiedLabel = verifiedLabel.replace(/[^A-Za-z0-9-_]/g, '');	

	// check for the validity of the label used for the plugin ID generation
	let validity = !(verifiedLabel.length === 0 || !verifiedLabel || /^\s*$/.test(verifiedLabel));

	return {validity, verifiedLabel};
};

// convert unix timestamp to date string
function TimestampToDate (ts){
	let date = new Date(ts);
	// Hours part from the timestamp
	let years = date.getFullYear(),
		months = "0" + (date.getMonth() + 1),
		days = "0" + date.getDate(),
		hours = "0" + date.getHours(),
		minutes = "0" + date.getMinutes(),
		seconds = "0" + date.getSeconds();

	return (years + "-" + months.substr(-2) + "-" + days.substr(-2) + " " + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2));
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

//  execute a generic query
function ExecuteQuery (url, name, query, sortkey, sortval, callback){
	MongoClient.connect(url, function(err, database){
		if (err) throw err;
		if (sortkey.length == 0)
		{
			// no sorting
			database.db(name).collection("objects").find(query).toArray(function(err, result) {
				if (err) throw err;
				database.close();
				callback(result);
			});
		}
		else{
			// sorting by sortKey and sortValue
			database.db(name).collection("objects").find(query).sort(sortkey, sortval).toArray(function(err, result) {
				if (err) throw err;
				database.close();
				callback(result);
			});			
		}
	});
}

// given the user data (website and name) and the settings stored in the c4dpluginid ACP returns an array with HTML for both paragraph and information
function PrepareHTMLFromUserWebsite(settings, userWebsite, userName) {

	let res = [];

	if (settings.notifydomain == "on") {
		// check if website has been set in the user profile
		if (userWebsite.length != 0) {
			let websiteArray = userWebsite.split(".");
			// check if the website is  compliant which means it should be
			// composed at least by three parts like <part1>.<part2>.<part3> and <part1> == "www"
			if (websiteArray.length >= 3 && websiteArray[0] == "www") {
				// use data from website
				res.push("MAXON API suggested domain space");
				res.push("The suggested MAXON API domain space, based on your profile, is: <b>" + websiteArray[2] + "." + websiteArray[1] + ".*</b>");
			}
			else {
				// use default value found in ACP
				res.push("MAXON API suggested domain space");
				res.push("The suggested MAXON API domain space, based on your profile, is: <b>" + settings.revdomainspace + "." +  userName + ".*</b>"); // To be changed
			}
		}
		else {
			// use default value found in ACP
			res.push("MAXON API suggested domain space");
			res.push("The suggested MAXON API domain space, based on your profile, is: <b>" + settings.revdomainspace + "." +  userName + ".*</b>");
		}
	}

	return res;
}

// given the pluginID array returns the proper HTML table
function PrepareHTMLfromPluginIDs(pluginIDArray, userName)
{
	let res = "";
	let size_a = 15, size_b = 55, size_c = 30;
	res = "<p>List of plugin ID assigned to <b>"+userName+"</b>:</p>";
	res +="<table width=500><tr><th width=\""+String(size_b)+"%\">Associated Label</th><th width=\""+String(size_a)+"%\">Plugin ID</th><th width=\""+String(size_c)+"%\">Creation Date</th></tr>";
	
	// process the queryRes to return the data on the client
	for (let i = 0; i < pluginIDArray.length; i++)
	{
		let pluginIDEntry = pluginIDArray[i];
		res += "<tr><td width=\""+String(size_b)+"%\">"+pluginIDEntry.label+"</td><td width=\""+String(size_a)+"%\">"+pluginIDEntry.pluginid+"</td><td width=\""+String(size_c)+"%\">"+TimestampToDate(pluginIDEntry.timestamp)+"</td></tr>";
	}

	res += "</table>";	

	return res;
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

				// return the information about MAXON API suggested domain space
				HTMLResObj.domainInfo = PrepareHTMLFromUserWebsite(settings, userWebsite, userName);

				// try to execute the query to retrieve all the plugin registered by the current user
				ExecuteQuery(dbUrl, dbName, PrepareQueryPluginIFromUser(userID), "timestamp", -1, function(pluginIDArray){	
					
					if (pluginIDArray.length != 0)
						// return the information about requested plugin IDs
						HTMLResObj.pluginidInfo = PrepareHTMLfromPluginIDs(pluginIDArray, userName);

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
		
		// check and prepare the label to be used for the plugin ID generation
		let resVerify = VerifyLabel(data.values[0]);
		
		// check for the validity of the label used for the plugin ID generation
		if (resVerify.validity){
		
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

					// return the information about MAXON API suggested domain space
					HTMLResObj.domainInfo = PrepareHTMLFromUserWebsite(settings, userWebsite, userName);

					// try to execute the query to check the next-to-be-used plugin ID
					ExecuteQuery(dbUrl, dbName, dbQueryNextPluginID, "", 1, function(queryRes){	
						
						// allocate the next-to-be-used plugin ID
						let pluginidObj = {
							_key : "pluginid:"+String(queryRes[0].nextID),
							pluginid : queryRes[0].nextID,
							uid : userID,
							label : resVerify.verifiedLabel,
							timestamp : Date.now()
							};
						
						// try to execute the insert of the new pluginid
						ExecuteIncrementAndInsert(dbUrl, dbName, pluginidObj, function(insertRes){

							// try to execute the query to retrieve all the plugin registered by the current user
							ExecuteQuery(dbUrl, dbName, PrepareQueryPluginIFromUser(userID), "timestamp", -1, function(pluginIDArray){	
							
								if (pluginIDArray.length != 0)
									// return the information about requested plugin IDs
									HTMLResObj.pluginidInfo = PrepareHTMLfromPluginIDs(pluginIDArray, userName);
		
								callback(null, HTMLResObj);
							});
						});
					});
				});
			});
		}		
		else{
			callback (null, "<b>Plugin ID generation failed!</b><br><p>Provide a valid string for the label.</p>");
		}
	}
};

module.exports = plugin;

