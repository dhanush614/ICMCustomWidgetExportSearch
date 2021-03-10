define([
	"dojo/_base/declare",
	"dojo/aspect",
	"dojo/_base/lang",
	"dojo/_base/array",
	"icm/action/Action",
	"icm/util/Coordination"
	], function(declare, aspect, lang, array, Action, Coordination) {

	return declare("icmcustom.action.ICMDeleteDocumentAction", [Action], {
		executing: false,

		isEnabled: function()
		{	
			var role=ecm.model.desktop.currentRole.name;
			var roleNames=this.propertiesValue.roleName;
			var roleNameArray=[];
			if(roleNames!="" && roleNames!=undefined)
			{
				roleNameArray=roleNames.split(',');
				if(!(roleNameArray.length>0 && roleNameArray.indexOf(role)>-1))
				{
					return false;
				}
			}

			if(this.getActionContext("Document"))
			{
				if(this.getActionContext("Document").length==0 || this.getActionContext("Document")[0]==undefined)
				{
					return false;
				}
				else
				{
					return true;
				}
			}
			else
			{
				return false;
			}
		},
		execute: function()
		{
			var self = this;
			var item=this.getActionContext("Document");
			var documentnameList=[];
			var creatorList=[];
			var dateCreatedList=[];
			var dateModifiedList=[];
			for(var j=0;j<item.length;j++)
			{
				documentnameList[j]=item[j].name;
				creatorList[j]=item[j].attributes.Creator;
				dateCreatedList[j]=this.formatDate(item[j].attributes.DateCreated);
				dateModifiedList[j]=this.formatDate(item[j].attributes.DateLastModified);
			}

			var columnHeadings = [
				{field: "Seq", name: "#", width: "5%"},
				{field: "DocTitle", name: "Document Title", width: "20%"},
				{field: "creatorId", name: "Creator", width: "20%"},
				{field: "creationDate", name: "Date Created", width: "20%"},
				{field: "modifiedDate", name: "Date Modified", width: "20%"},
				];

			var columnValues = [];

			if (documentnameList) {
				for (var i = 0; i < documentnameList.length; i++) {
					columnValues.push({Seq: i+1, DocTitle: documentnameList[i], creatorId: creatorList[i], creationDate: dateCreatedList[i], modifiedDate: dateModifiedList[i], message: ecm.model.Message({level: 0, text: "<b>Document Title: </b>" + documentnameList[i] + " <b>created By: </b>"+ creatorList[i] + " <b>Created on: </b>"+ dateCreatedList[i] + " <b>Modifed on: </b>" + dateModifiedList[i]})});
				}
			}

			var batchResultsDialog = new ecm.widget.dialog.BatchResultsDialog({
				dialogTitle: "Delete Document",
				dialogIntro: "List of Documents displayed in the grid will be deleted.",
				columns: columnHeadings,
				statusItems: columnValues,
				onExecute: function() {
					self.getActionContext("Case")[0].repository.deleteItems(item,function(){
						console.log("Document Delected Successfully");
					},true);
				}
			});		

			batchResultsDialog.setResizable(false);
			batchResultsDialog.setSizeToViewportRatio(false);
			batchResultsDialog._setSizeToViewportRatio = false;
			batchResultsDialog._lockFullscreen=true;
			batchResultsDialog.setMaximized(false);
			batchResultsDialog.setSize(1000, 500);
			batchResultsDialog.fitContentArea = true;			
			batchResultsDialog.addButton("Ok",batchResultsDialog.onExecute,false,false);

			batchResultsDialog.show();
			
			aspect.after(batchResultsDialog, "resize", lang.hitch(this,function(){
				if(batchResultsDialog && batchResultsDialog._grid){
					batchResultsDialog._grid.resize({h:batchResultsDialog.contentArea.clientHeight-40});
					
		        }
			}),true);
			batchResultsDialog._grid.resize({h:batchResultsDialog.contentArea.clientHeight-40});
		},

		formatDate: function(dateToBeFormatted)
		{
			var finalDate=null;
			if(dateToBeFormatted!=null){
				var newDate = new Date(dateToBeFormatted);
				var sMonth = newDate.getMonth() + 1;
				var sDay = newDate.getDate();
				var sYear = newDate.getFullYear();
				var sHour = newDate.getHours();
				var sMinute = newDate.getMinutes();
				if(sMinute<10){
					sMinute="0"+sMinute;}
				var sAMPM = "AM";
				var iHourCheck = parseInt(sHour);
				if (iHourCheck > 12) {
					sAMPM = "PM";
					sHour = iHourCheck - 12;
				}
				else if (iHourCheck == 12) {
					sAMPM = "PM";
					sHour = "12";
				}
				else if (iHourCheck === 0) {
					sHour = "12";
				}

				finalDate=sMonth + "/" + sDay + "/" + sYear + ", " + sHour + ":" + sMinute + " " + sAMPM;
			}
			return finalDate;


		},
		_eoc_:null
	});
});
