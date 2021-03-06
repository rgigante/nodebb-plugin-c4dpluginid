# c4dpluginid Plugin for NodeBB

A plugin to request Cinema 4D plugin IDs and notify user about the MAXON API domain space to use for developing Cinema 4D plugins. 

The plugin needs the "Custom Pages" plugin to be installed and a custom page to be created with the following data used in the custom page "content" area:

```html
<!DOCTYPE html>
<html>
<head>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js"></script>
<script>
// executed upon the document is ready
// retrieve the list of all the registration IDs belonging to the user and list them in the page
$(document).ready(function() {
  socket.emit('modules.onLoadPage', function(err, result) {
    if (result.domainInfo !== undefined)
    {
      if (result.domainInfo[0] !== undefined && result.domainInfo[0].length != 0)
        document.getElementById("suggestedDomainH4").innerHTML = result.domainInfo[0];
      
      if (result.domainInfo[1] !== undefined && result.domainInfo[1].length != 0)
        document.getElementById("suggestedDomain").innerHTML = result.domainInfo[1];
      
      if (result.domainInfo[2] !== undefined && result.domainInfo[2].length != 0)
      document.getElementById("form").innerHTML = result.domainInfo[2];
    }
    if (result.pluginidInfo !== undefined && result.pluginidInfo.length != 0 )
      document.getElementById("registeredID").innerHTML = result.pluginidInfo;
  })
});

// executed upon the the 'generate ID' button is pressed
// parse the information provided in the form, request a new valid id, store it by updating the DB, 
// retrieve the list of all the registration IDs belonging to the user and  list them in the page
function GenerateID(){
  let pluginLabel = document.getElementById("pluginLabel").value;
  document.getElementById("pluginLabel").value = '';
  socket.emit('modules.onGenerateID', {values: [pluginLabel]}, function(err, result) {
    if (result.domainInfo !== undefined)
    {
      if (result.domainInfo[0] !== undefined && result.domainInfo[0].length != 0)
        document.getElementById("suggestedDomainH4").innerHTML = result.domainInfo[0];
      
      if (result.domainInfo[1] !== undefined && result.domainInfo[1].length != 0)
        document.getElementById("suggestedDomain").innerHTML = result.domainInfo[1];
      
      if (result.domainInfo[2] !== undefined && result.domainInfo[2].length != 0)
      document.getElementById("form").innerHTML = result.domainInfo[2];
    }
    if (result.pluginidInfo !== undefined && result.pluginidInfo.length != 0 )
      document.getElementById("registeredID").innerHTML = result.pluginidInfo;

    document.getElementById("pluginLabel").innerHTML = "done";
  });
}
</script>
</head>

<body>
<h4 id="suggestedDomainH4"></h4>
<p id="suggestedDomain"></p>
<p id="form"></p>
<p id="registeredID"></p>
</body>
</html>
```

## Prerequisites
This plugin requires at this stage **Custom Pages for NodeBB** plugin to be installed. The plugin is available [here](https://github.com/psychobunny/nodebb-plugin-custom-pages#readme).

## Installation

    npm install nodebb-plugin-c4dpluginid  

After installing the plugin it's mandatory to create a document used to store the global pluginID values using
```js
$ mongo <dbname> -u <username> -p <password>

> db.getCollection('objects').insertOne({ _key : "globalPluginID", nextID : NumberInt(<YourInitialValue>), lastCreated : 0.0})
```  

## Data storage
The plugin makes use of a document (a MongoDB record) to store global information about pluginID actually structured as follow:
```json
{
    "_key" : "globalPluginID",
    "nextID" : 1100001,
    "lastCreated" : 0.0
}
```
The *nextID*  value can be initialized to any desired values.
The *lastCreate* store the timestamp of the last created plugin ID.

Each pluginID entry is stored in a separate document actually structured as follow:
```json
{
    "_key" : "pluginid:1100000",
    "pluginid" : 1100000,
    "uid" : 1,
    "label" : "MyFirstPlugin",
    "timestamp" : 1530535713654.0
}
```
The *_key* stores a unique string containing information about the entry.
The *pluginid* stores the actual ID of the plugin.
The *uid* stores the user who created the plugin ID.
The *label* stores the name used for identifying the plugin ID.
The *timestamp* stores the creation timestamp.