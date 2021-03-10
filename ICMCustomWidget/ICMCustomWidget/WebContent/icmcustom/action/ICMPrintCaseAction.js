define([
	"dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "icm/action/Action",
    "icm/util/Coordination",
    "ecm/widget/dialog/BaseDialog"
	], function(declare, lang, array, Action, Coordination,BaseDialog) {

	return declare("icmcustom.action.ICMPrintCaseAction", [Action], {

		executing: false,
		attributes:null,

		isEnabled: function()
		{
			return true;
		},
		execute: function()
		{
			var self=this;
			var isComment = this.propertiesValue.iscomment;//if this is Y user will get confirmation dialog to print case with comments as well
			var confirmBoxLabel = this.propertiesValue.label;
			var confirmBoxText = this.propertiesValue.text;
			var cancelButtonLabel = this.propertiesValue.cancelButtonLabel;
			this.windowHeight = this.propertiesValue.windowHeight;
			this.windowWidth = this.propertiesValue.windowWidth;
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

			var multiValueCaseProperties=this.propertiesValue.multiValueCaseProperties;
			if(multiValueCaseProperties==null || multiValueCaseProperties=="NA"){

				//no need of doing anything. this means that multi value property table functionality is not enabled
			}
			else{
				try{
					caseProperties=caseProperties.concat(this._getCaseMultivalueProperties(workitemobj));
				}catch (Error) {
					alert("Error while constructing multi value property table:"+ Error.name + " - " + Error.description + "\r\n" + Error.message);
					this.executing=false;
					this.setEnabled(true);
					return false;
				}
			}

			self._printCaseComments(workitemobj,caseProperties,self);

		},
		_getYesNoValue:function(isComment,self){

			var confirmBoxLabel = self.propertiesValue.label;
			var confirmBoxText = self.propertiesValue.text;
			var cancelButtonLabel = self.propertiesValue.cancelButtonLabel;
			var contextType = self.propertiesValue.contextTypeValue;//it should be either WorkItem or Case
			var workObj = self.getActionContext(contextType);

			var workitemobj = workObj[0];
			//alert(workitemobj);

			var caseProperties=this._getCaseProperties(workitemobj);

			if(isComment=="Yes"){//when this property configured as Y then only show the confirmation box or else print the case properties only

var confirmationDialog = new dijit.Dialog({
                            title: "<span class='PrintCommentsConfirmation'>"+confirmBoxLabel+"</span>",
                            content: "<br><span>" + confirmBoxText +" </span><br><br><br><br><br><br><hr>",
                            style: "position: relative; width: 800px; height: 400px; "
                        });
                        confirmationDialog.withCommentsButton = new dijit.form.Button({
                            label: "Print with comments",
                            style: "margin-left: 200px;"
                        });
                        confirmationDialog.addChild(confirmationDialog.withCommentsButton);
                        
                        confirmationDialog.withoutCommentsButton = new dijit.form.Button({
                            label: "Print without Comments"
                        });
                        confirmationDialog.addChild(confirmationDialog.withoutCommentsButton); 
                                              
  						confirmationDialog.cancelButton = new dijit.form.Button({
                            label: "No"
                        });
                        confirmationDialog.addChild(confirmationDialog.cancelButton);
                        confirmationDialog.show();
                        confirmationDialog.withCommentsButton.on('click', function(e) {
                                self._printCasewithComments(workitemobj,caseProperties);//print case properties with comments
                            confirmationDialog.hide();
                            confirmationDialog.destroy();
                        });
                                confirmationDialog.withoutCommentsButton.on('click', function(e) {
                           self._sendToPrint(self,caseProperties);//print case properties only without any comments
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
				this._sendToPrint(self,caseProperties);
			}

		},
		_getCaseProperties:function(workitemobj,contextType){
			var caseProperties = this.propertiesValue.caseproperties;
			if(caseProperties==null){
				this.logInfo("_getCaseProperties", "Looks like there is no case properties configured.");
				return false;
			}

			var casePropertiesArr=caseProperties.split(",");
			var displayProperties = this.propertiesValue.displayproperties;
			var displayPropertiesArr=displayProperties.split(",");
			var printPageDisplayTitle = this.propertiesValue.printPageDisplayTitle;
			var casePropertyLabel = this.propertiesValue.casePropertyLabel;

			var casePropertyTable='<html><head><title>'+printPageDisplayTitle+'</title></head><body>';
			casePropertyTable=casePropertyTable.concat('<table id="myTable1" align="center" style="border-collapse: collapse;border:1px solid black">');
			casePropertyTable=casePropertyTable.concat('<CAPTION><b>'+casePropertyLabel+'<b></CAPTION><br><br>');

			var arrLength=casePropertiesArr.length;

			for (var i = 0; i < arrLength; i++)
			{

				if(displayPropertiesArr[i]==null){
					this.logInfo("_getCaseProperties", "Please check configuration looks like you have missed out display property for this index:"+i);
				}
				if(i==0){
					casePropertyTable=casePropertyTable.concat('<tr><td style="border:1px solid black"><b>',displayPropertiesArr[i]).concat('</b></td>');
				}

				else{
					casePropertyTable=casePropertyTable.concat('<tr><td style="border:1px solid black">',displayPropertiesArr[i]).concat('</td>');
				}
				var propvalue = this.attributes[casePropertiesArr[i]];

				//formating date properties 
				var dateprop = this.propertiesValue.dateproperties;
				if(dateprop!=null){

					var datearr = dateprop.split(",");
					for(var p = 0; p < datearr.length; p++){

						if(casePropertiesArr[i] == datearr[p]){
							var d = new Date(propvalue);
							if(propvalue!=null)
							{
								var date = d.getDate();
								if(date <10){
									date = '0'+date;
								}
								var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
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
				casePropertyTable=casePropertyTable.concat('<td style="border:1px solid black">',propvalue).concat('</td></tr>');
			}
			casePropertyTable=casePropertyTable.concat('</table><br><br>');

			return casePropertyTable;                  

		},

		//returns html table for multivalue properties
		_getCaseMultivalueProperties:function(workitemobj){

			var multiValueCaseProperties = this.propertiesValue.multiValueCaseProperties;
			var multiValueCasePropertiesArr=multiValueCaseProperties.split(",");
			var multiValueDisplayProperties = this.propertiesValue.multiValueDisplayProperties;
			var displayPropertiesArr=multiValueDisplayProperties.split(",");
			var multiValuePropertyTableLabel = this.propertiesValue.multiValuePropertyTableLabel;

			var casePropertyTable='<table id="myTable1" align="center" style="border-collapse: collapse;border:1px solid black">';
			casePropertyTable=casePropertyTable.concat('<CAPTION><b>'+multiValuePropertyTableLabel+'<b></CAPTION><br><br>');

			//to know how many rows need to be constructed for the property table as all the properties in multivalue property table are mandatory
			var firstMultiValuePropertyArr = this.attributes[multiValueCasePropertiesArr[0]];

			var displayPropertiesArrLength=displayPropertiesArr.length;

			casePropertyTable=casePropertyTable.concat('<tr>');
			//constructing table header with columns
			for (var i = 0; i < displayPropertiesArrLength; i++){

				casePropertyTable=casePropertyTable.concat('<td style="border:1px solid black"><b>',displayPropertiesArr[i]).concat('</b></td>');
			}
			casePropertyTable=casePropertyTable.concat('</tr>');

			var firstMultiValuePropertyArrLength=firstMultiValuePropertyArr.length;
			for (var i = 0; i < firstMultiValuePropertyArrLength; i++)//iterating rows
			{
				casePropertyTable=casePropertyTable.concat('<tr>'); 
				for (var j = 0; j < displayPropertiesArrLength; j++)
				{//constructing columns values for a row
					
					var multiValuePropertyArr = this.attributes[multiValueCasePropertiesArr[j]];
					var multiValuePropertyValue=multiValuePropertyArr[i];
					casePropertyTable=casePropertyTable.concat('<td style="border:1px solid black">',multiValuePropertyValue).concat('</td>');
				}
				casePropertyTable=casePropertyTable.concat('</tr>');
			}
			casePropertyTable=casePropertyTable.concat('</table><br><br>');

			return displayPropertiesArr;
		},
		buildTemplate: function(){

			var htmlstring='<div data-dojo-type="dijit/layout/ContentPane" data-dojo-attach-point="gridContainer"></div>';
			return htmlstring;
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
						//     alert("commentObj[i]:"+commentObj[i]);
						creator = JSON.stringify(commentObj[i].creator);
						//     alert("creator: " + creator);

						commenttext = JSON.stringify(commentObj[i].text);
						//     alert("commentText: " + commenttext);

						dateCreated = JSON.stringify(commentObj[i].dateCreated);
						//     alert("dateCreated: " + dateCreated);
						if(i==0){
							csvData += "CommentText,Creator,DateCreated" +"\n";
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
		_printCaseComments:function(workitemobj,printObjString,self){


			var displayPropertiesArr =this._getCaseProperties(workitemobj);
			var results=displayPropertiesArr;
			this.storeValue=results;
			this.resultSet = results;
			this.finalStores=this.storeValue;
			this.storeValue.length=results.length;

			this.htmlTemplate='<div data-dojo-type="dijit/layout/ContentPane" data-dojo-attach-point="gridContainer"></div>';
			this.initiateTaskDialog = new BaseDialog({

				cancelButtonLabel:"Cancel",
				contentString:'<div data-dojo-type="dijit/layout/ContentPane" data-dojo-attach-point="gridContainer"></div>',
				createGrid: function(){

					var data = {
							identifier: 'id',
							items:[]    
					};

					var Array=[];                             
					var column1="Property";
					var column2="Value";
					var caseprop=self.propertiesValue.caseproperties;
					var caseproparr=caseprop.split(',');
					var displayname=self.propertiesValue.displayproperties;
					var displaynamearr=displayname.split(',');

					var valarr=[];
					for(var i=0;i<caseproparr.length;i++){

						valarr[i]=self.attributes[caseproparr[i]];


						//formating date properties 
						var dateprop = self.propertiesValue.dateproperties;
						if(dateprop!=null){

							var datearr = dateprop.split(",");
							for(var p = 0; p < datearr.length; p++){

								if(caseproparr[i] == datearr[p]){
									var d = new Date(valarr[i]);
									if(valarr[i]!=null)
									{
										var date = d.getDate();
										if(date <10){
											date = '0'+date;
										}
										var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
										var day = ["Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
										var year = d.getFullYear();

										valarr[i] = day + ' ' + month + ' ' + date + ' ' + year ;
									}
								}
							}
						} 

						var multiprop=self.propertiesValue.multiValueCaseProperties;
						var x="";
						if(multiprop!=null){

							var multiarr = multiprop.split(",");
							for(var p = 0; p < multiarr.length; p++){

								if(caseproparr[i] == multiarr[p]){

									if(valarr[i]!=null)
									{


										for(j=0;j<valarr[i].length;j++){
											if(j==valarr[i].length-1){
												x=x+valarr[i][j];
											}
											else{
												x=x+valarr[i][j]+',';
											}
										}
										valarr[i]=x;
									}
								}
							}
						}
					}

					for(var i=0;i<caseproparr.length;i++)
					{
						Array[i]=[];
						Array[i][column1]=[];
						Array[i][column2]=[];
						Array[i][column1]=displaynamearr[i];
						Array[i][column2]=valarr[i];
					}



					for(var i=0, l=Array.length; i<caseproparr.length; i++){
						data.items.push(dojo.mixin({ id:i+1 }, Array[i%l]));
					}

					var store = new dojo.data.ItemFileWriteStore({data: data});

					/*set up layout*/
					var layout = [[    
						{'name': 'Property Name', 'field':'Property','width':'200px'},
						{'name': 'Value', 'field': 'Value','width':'200px'}

						]];

					var grid = new dojox.grid.EnhancedGrid({
						store: store,
						structure:layout, 
						selectRowTriggerOnCell: true,
						rowSelector: '20px',

					});

					this.gridContainer.set("content", grid);
					grid.startup();

				},
				onExecutePrint: function(){

					//alert("PRINT");
					var isComment = self.propertiesValue.iscomment;
					self._getYesNoValue(isComment,self);
					var caseProperties=self._getCaseProperties(workitemobj);


				}

			});

			if(this.propertiesValue.width!="")
				var size=this.propertiesValue.width.split(',');
			this.initiateTaskDialog.setTitle(this.propertiesValue.label);
			this.initiateTaskDialog.addButton("Print",this.initiateTaskDialog.onExecutePrint);
			this.initiateTaskDialog.createGrid();
			if(size[0]&&size[1])
				this.initiateTaskDialog.setSize(size[0],size[1]);
			else
				this.initiateTaskDialog.setSize(450,500);
			this.initiateTaskDialog.setResizable(true);
			this.initiateTaskDialog.show();

			var self=this;

		},
		_printCasewithComments:function(workitemobj,printObjString){

			var self=this;
			try{
				workitemobj.caseObject.retrieveCaseComments(function(comment)
						{
					require(["dojo/json"], function(JSON) 
							{             
						var commentJsonStr = JSON.stringify(comment);
						var commentObj = JSON.parse(commentJsonStr);


						printObjString=printObjString.concat('<table id="myTable11" align="center" style="border-collapse: collapse;border:1px solid black"> ');
						printObjString=printObjString.concat('<CAPTION><b>Case Comments<b></CAPTION><br><br>');
						//construct table for case comments and display 3 columns: Comments, Created By,Data Created, 
						printObjString=printObjString.concat('<tr><td style="border:1px solid black"><b>Comments<b></td><td style="border:1px solid black"><b>Created By<b></td><td style="border:1px solid black"><b>Date Created<b></td></tr>');
						for(var i=0;i<commentObj.length;i++)
						{
							//    alert("commentObj[i]:"+commentObj[i]);
							creator = JSON.stringify(commentObj[i].creator).replace(/\"/g, "");
							//    alert("creator: " + creator);

							commenttext = JSON.stringify(commentObj[i].text).replace(/\"/g, "");
							//    alert("commentText: " + commenttext);

							dateCreated = JSON.stringify(commentObj[i].dateCreated).replace(/\"/g, "");
							//    alert("dateCreated: " + dateCreated);

							printObjString=printObjString.concat('<tr><td style="border:1px solid black">'+commenttext+'</td><td style="border:1px solid black">'+creator+'</td><td style="border:1px solid black">'+dateCreated+'</td></tr>');  
						}

						printObjString= printObjString.concat('</table>').concat('</body></html>');
						self._sendToPrint(self,printObjString);
							}
					);

						}); 

			} catch (Error) {
				alert("Error while constructing case comments:"
						+ Error.name + " - " + Error.description + "\r\n" + Error.message);
				this.executing=false;
				this.setEnabled(true);
				return false;
			}

		},

		_sendToPrint:function(self,printObjString){

			try{
				var mywindow = window.open('', 'Print_Case', 'height='+self.windowHeight,'width='+self.windowWidth);
				mywindow.document.write(printObjString);
				mywindow.document.close();
				mywindow.focus();
				mywindow.print();
				mywindow.close();

			}catch (Error) {
				alert("Error while sending to print:"
						+ Error.name + " - " + Error.description + "\r\n" + Error.message);
				self.executing=false;
				self.setEnabled(true);
				self.destroy();
				return false;
			}

			self.executing=false;
			self.setEnabled(true);
			self.destroy();

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
