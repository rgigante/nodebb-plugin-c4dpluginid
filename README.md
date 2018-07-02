# c4dpluginid Plugin for NodeBB

A plugin to generate Cinema 4D plugin IDs and notify user about the MAXON API domain space to use for developing Cinema 4D plugins. 

The plugin needs the "Custom Pages" plugin to be installed and a custom page to be created with the following data used in the custom page "content" area:

```html
<!DOCTYPE html>
<html>
<head>
<script>

// executed upon the document is ready
// retrieve the list of all the registration IDs belonging to the user and list them in the page
$(document).ready(function() {
  //console.log("$(document).ready"); // debug
  socket.emit('modules.onLoadPage', function(err, result) {
    if (result.domainInfo.length == 2 && result.domainInfo[0].length != 0)
    {
      document.getElementById("suggestedDomainH4").innerHTML = result.domainInfo[0];
      document.getElementById("suggestedDomain").innerHTML = result.domainInfo[1];
    }
    document.getElementById("registeredID").innerHTML = result.pluginidInfo;
    //alert(result);
  })
});

// executed upon the the 'generate ID' button is pressed
// process the information provided in the form, generate a new valid id, store it by updating the DB, 
// retrieve the list of all the registration IDs belonging to the user and  list them in the page
function GenerateID()
{
  //console.log("GenerateID()"); // debug
  let pluginLabel = document.getElementById("pluginLabel").value;
  socket.emit('modules.onGenerateID', {values: [pluginLabel]}, function(err, result) {
    if (result.domainInfo.length == 2 && result.domainInfo[0].length != 0)
    {
      document.getElementById("suggestedDomainH4").innerHTML = result.domainInfo[0];
      document.getElementById("suggestedDomain").innerHTML = result.domainInfo[1];
    }
    document.getElementById("registeredID").innerHTML = result.pluginidInfo;
    //alert(result);
  });
}
</script>
</head>

<body>
<h4 id="suggestedDomainH4"></h4>
<p id="suggestedDomain"></p>
<h4>Plugin ID generation</h4>
<form>
  Label:&nbsp;<input type="text" name="pluginLabel" id="pluginLabel" maxlength="256" />
  <button type="button" onclick="GenerateID()">Get PluginID</button>
</form>
<hr><p id="registeredID"></p>
</body>
</html>
```

## Prerequisites
This plugin requires at this stage **Custom Pages for NodeBB** plugin to be installed. The plugin is available [here].(https://github.com/psychobunny/nodebb-plugin-custom-pages#readme)

## Installation

    npm install nodebb-plugin-c4dpluginid

