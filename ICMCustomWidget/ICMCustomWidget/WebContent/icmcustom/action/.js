define([
	"dojo/_base/declare",
	"icm/action/Action"
], function(declare, Action) {

	return declare("icmcustom.action.ICMCustomAction", [Action], {
		execute: function(){
			var msg = "[Action properties]\n";
			for(var key in this.propertiesValue){
				msg += key + ": " + this.propertiesValue[key] + "\n";
			}
			alert(msg);
		}
	});
});
