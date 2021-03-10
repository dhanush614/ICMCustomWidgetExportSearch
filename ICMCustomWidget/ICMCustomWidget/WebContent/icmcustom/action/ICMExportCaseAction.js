define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"icm/action/Action",
	"icm/util/Coordination"
	], function(declare, lang, array, Action, Coordination) {

	return declare("icmcustom.action.ICMExportCaseAction", [Action], {

		executing: false,
		attributes:null,

		isEnabled: function()
		{

			if (this.executing)
			{
				return false;
			}
			return true;
		},

		execute: function()
		{
			this.executing = true;
			var self=this;
			var isComment = this.propertiesValue.iscomment;//if this is Y user will get confirmation dialog to export case with comments as well or else will export comments also without alert

			var confirmBoxLabel = this.propertiesValue.label;

			var confirmBoxText = this.propertiesValue.text;

			var cancelButtonLabel = this.propertiesValue.cancelButtonLabel;

			var contextType = this.propertiesValue.contextTypeValue;//it should be either WorkItem or Case

			var workObj = this.getActionContext(contextType);

			var workitemobj = workObj[0];


			if(contextType=="WorkItem"){
				this.attributes = workitemobj.attributes;
			}
			else{
				this.attributes = workitemobj.caseObject.attributes;
			}
			var caseProperties=this._getCaseProperties(workitemobj);
			if(isComment=="Yes"){
			var confirmationDialog = new dijit.Dialog({
                            title: "<span class='ExportCommentsConfirmation'>"+confirmBoxLabel+"</span>",
                            content: "<br><span>" + confirmBoxText +" </span><br><br><br><br><br><br><hr>",
                            style: "position: relative; width: 850px; height: 400px; "
                        });
                        debugger ;confirmationDialog.withCommentsButton = new dijit.form.Button({
                            label: "Export with comments",
                            style: "margin-left: 200px;"
                        });
                        confirmationDialog.addChild(confirmationDialog.withCommentsButton);
                        
                        confirmationDialog.withoutCommentsButton = new dijit.form.Button({
                            label: "Export without Comments"
                        });
                        confirmationDialog.addChild(confirmationDialog.withoutCommentsButton); 
                                              
  						confirmationDialog.cancelButton = new dijit.form.Button({
                            label: "No"
                        });
                        confirmationDialog.addChild(confirmationDialog.cancelButton);
                        confirmationDialog.show();
                        confirmationDialog.withCommentsButton.on('click', function(e) {
                                self._exportCaseComments(self,workitemobj,caseProperties);
                            confirmationDialog.hide();
                            confirmationDialog.destroy();
                        });
                                confirmationDialog.withoutCommentsButton.on('click', function(e) {
                            self._exporttoCSV(self,self.csvFileName,caseProperties);//export case properties only without any comments
                            self.executing=false;
							self.setEnabled(true);
							self.destroy();
						//this.destroy();
							confirmationDialog.hide();
                            confirmationDialog.destroy();
                        });
						confirmationDialog.cancelButton.on('click', function(e) {
							self.executing=false;
							self.setEnabled(true);
							self.destroy();
							//this.destroy();
                            confirmationDialog.hide();
                            confirmationDialog.destroy();
                        });

				
			}

			else{
				self._exporttoCSV(self,self.csvFileName,caseProperties);//export case properties only without any comments
				self.executing=false;
				self.setEnabled(true);
				self.destroy();
			}

		},

		_getCaseProperties: function(workitemobj){

			var caseProperties = this.propertiesValue.caseproperties;

			var casePropertiesArr=caseProperties.split(",");

			var displayProperties = this.propertiesValue.displayproperties;

			var filePrefix = this.propertiesValue.filePrefix;

			var displayPropertiesArr=displayProperties.split(",");

			var csvData="";

			var arrLength=casePropertiesArr.length;

			for (var i = 0; i < arrLength; i++)
			{

				if(i==0){
					this.csvFileName=filePrefix+"_"+workitemobj.caseObject.attributes[casePropertiesArr[0]];
				}
				var propvalue = this.attributes[casePropertiesArr[i]];
				var numberValues=this.propertiesValue.numberValues;
				if(numberValues!=null)
				{
					var numberValue = numberValues.split(",");
					for(var n = 0; n < numberValue.length; n++){
						if(casePropertiesArr[i]==numberValue[n])
						{
							if(propvalue!=null)
								propvalue=""+propvalue;
						}
					}

				}
				//Logic to combine comma seperated values in a single cell
				var commaValues=this.propertiesValue.commaValues;
				if(commaValues!=null)
				{
					var commaValue = commaValues.split(",");
					for(var c = 0; c < commaValue.length; c++){
						if(casePropertiesArr[i]==commaValue[c])
						{
							if(propvalue!=null)
								propvalue='"'+propvalue+'"';	
						} 
					}
				}
				//formating date properties 
				var dateprop = this.propertiesValue.dateproperties;
				if(dateprop!=null){
					var datearr = dateprop.split(",");
					for(var p = 0; p < datearr.length; p++){

						if(casePropertiesArr[i] == datearr[p]){
							if(propvalue!=null)
							{
								var d = new Date(propvalue);
								var date = d.getDate();
								if(date <10){
									date = '0'+date;
								}
								var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
								var day = ["Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
								var year = d.getFullYear();
								propvalue = day + ' ' + month + ' ' + date + ' ' + year ;
							}
						}
					}
				}

				if(propvalue==null)
				{
					propvalue="";
				}

				csvData += displayPropertiesArr[i] + ","+ propvalue + "\n";

			}

			return 	csvData;			

		},

		_exportCaseComments: function(self,workitemobj,csvData){

			workitemobj.caseObject.retrieveCaseComments(function(comment)
					{
				require(["dojo/json"], function(JSON) 
						{             
					var commentJsonStr = JSON.stringify(comment);
					var commentObj = JSON.parse(commentJsonStr);
					csvData += "\n";
					csvData += "\n";
					csvData +=  "Case Comments" + "\n";

					for(var i=0;i<commentObj.length;i++)
					{

						//	alert("commentObj[i]:"+commentObj[i]);
						creator = JSON.stringify(commentObj[i].creator);
						//	alert("creator: " + creator);

						commenttext = JSON.stringify(commentObj[i].text);
						//	alert("commentText: " + commenttext);

						dateCreated = JSON.stringify(commentObj[i].dateCreated);
						//	alert("dateCreated: " + dateCreated);
						if(i==0){
							csvData += "CommentText,Creator,DateCreated" + "\n";
						}

						csvData += commenttext + "," + creator+ "," + dateCreated + "\n";

					}

					self._exporttoCSV(self,self.csvFileName,csvData);
					self.executing=false;
					self.setEnabled(true);
					self.destroy();
						}

				);
					}); 

		},


		_exporttoCSV: function(self,fileName,csvContent) {
			fileName=fileName+".csv";
			var D = document;
			var a = D.createElement('a');
			var strMimeType = 'application/octet-stream;charset=utf-8';
			var rawFile;
			//alert("inside");
			//alert("navigator.appName:"+navigator.appName);
			if (navigator.appName.toLowerCase().indexOf("microsoft")>-1) { // IE<10


				var frame = D.createElement('iframe');
				document.body.appendChild(frame);
				frame.setAttribute('style', 'display:none;');
				frame.contentWindow.document.open("text/html", "replace");
				frame.contentWindow.document.write(csvContent);
				frame.contentWindow.document.close();
				frame.contentWindow.focus();
				frame.contentWindow.document.execCommand('SaveAs', true, fileName);
				document.body.removeChild(frame);
				return true;
			}
			// IE10+
			if (navigator.msSaveBlob) {
				return navigator.msSaveBlob(new Blob([csvContent], {
					type: strMimeType
				}), fileName);
			}
			// html5 A[download]
			if ('download' in a) {
				var blob = new Blob([csvContent], {
					type: strMimeType
				});
				rawFile = URL.createObjectURL(blob);
				a.setAttribute('download', fileName);
			} else {
				rawFile = 'data:' + strMimeType + ',' + encodeURIComponent(csvContent);
				a.setAttribute('target', '_blank');
				a.setAttribute('download', fileName);
			}
			a.href = rawFile;
			a.setAttribute('style', 'display:none;');
			D.body.appendChild(a);
			setTimeout(function() {
				if (a.click) {
					a.click();
					// Workaround for Safari 5
				} else if (document.createEvent) {
					var eventObj = document.createEvent('MouseEvents');
					eventObj.initEvent('click', true, true);
					a.dispatchEvent(eventObj);
				}
				D.body.removeChild(a);
			}, 100);


		},


		_eoc_:null

	});
});
