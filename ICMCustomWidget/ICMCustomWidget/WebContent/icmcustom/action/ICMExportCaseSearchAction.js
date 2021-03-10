define([
	"dojo/_base/declare",
	"icm/action/Action"
], function(declare,  Action) {

	return declare("icmcustom.action.ICMExportCaseSearchAction", [Action], {

		executing: false,
		attributes: null,

		isEnabled: function() {

			if (this.executing) {
				return false;
			}
			return true;
		},

		execute: function() {
			//debugger;
			try {
				var page = this.widget.page;
				String.prototype.paramReplace = function(str, newstr) {
					return this.split(str).join(newstr);
				};

				for (var p in page) {
					var w = page[p];

					if (w && w.declaredClass == "icm.pgwidget.caselist.CaseList") {


						if (navigator.appName == "Netscape") {
							//debugger;
							//var csvData = "data:text/csv;charset=utf-8,";
							var csvData;
							var columnName1 = "";
							var cnames = w.caseListModel._result.columnNames;

							var resultSet = w.caseListModel._result.structure.cells[0];

							var colLength = resultSet.length;
							for (var k = 0; k < colLength; k++) {
								if (resultSet[k].name == "Modified By") {
									resultSet[k].name = "Last Modified By";
								} else if (resultSet[k].name == "Modified On") {
									resultSet[k].name = "Last Modified Date";
								}

								columnName1 += resultSet[k].name + ",";
							}

							csvData = columnName1 + "\n";


							var items = w.caseListModel._result.items;


							items.sort(function(a, b) {
								var x = a.attributes.DateCreated;
								var y = b.attributes.DateCreated;

								return ((x > y) ? -1 : ((x < y) ? 1 : 0));
							});

							var ct = items.length;
							var vals1 = "";

							if (ct > 0) {
								for (var j = 0; j < ct; j++) {
									var item1 = items[j].attributeDisplayValues;
									var item2 = items[j].attributes;
									vals1 = this.reportData(item2, item1, cnames);

									csvData += vals1 + "\n";
									vals1 = "";
								}
								var fileNamePrefix = this.propertiesValue.fileName;
								var fileName = "";
								if (fileNamePrefix != "" && fileNamePrefix != null) {
									fileName = this.generateFileNameWithTimestamp(fileNamePrefix, "csv");
								} else {
									fileName = this.generateFileNameWithTimestamp("Case Search List-", "csv");
								}

								this.downloadFile(fileName, csvData);
							} else {
								var emptySearchMessage = this.propertiesValue.emptySearchMessage;
								var dispalyEmptyMessage = "";
								if (emptySearchMessage != "" && emptySearchMessage != null) {
									dispalyEmptyMessage = emptySearchMessage;
								} else {
									dispalyEmptyMessage = "Case List is Empty ,Please Search with Valid Criteria.";
								}
								new ecm.widget.dialog.MessageDialog({
									text: "<b>" + dispalyEmptyMessage + "</b>"
								}).show();
								abort({
									'silent': true
								});

							}
						}
					}
				}
			} catch (exception) {
				console.log("Exception:" + exception);
			}

		},
		reportData: function(reportVal1, reportVal2, cnames) {
			try {
				// Generte Report 
				if (reportVal1 == null || reportVal2 == null) {
					return "";
				} else {
					//debugger;
					var ccount = cnames.length;
					var rowElement = "";
					var rowElementRefined = "";
					var searchParam = "";
					var searchParamRefined = "";
					var tempString = "";
					for (var k = 0; k < ccount; k++) {
						if (reportVal1.hasOwnProperty(cnames[k])) {

							if (cnames[k] == "DateLastModified") {
								//debugger;
								var dateArr = [];
								tempString = reportVal1[cnames[k]];
								dateArr = tempString.split('-');
								var date = dateArr[2].substr(0, 2);
								var month = dateArr[1];
								var year = dateArr[0];
								var fullDate = month + "/" + date + "/" + year;
								var dateString = tempString.substring(0, 10);
								var timeString = tempString.substring(11);
								var H = +timeString.substr(0, 2) - 5;
								var h = (H % 12) || 12;
								var ampm = H < 12 ? "AM" : "PM";
								timeString = h + timeString.substr(2, 3) + ampm;
								searchParam = fullDate + " " + timeString;


							} else
								if ((cnames[k] == "LastModifier") || (cnames[k] == "CmAcmCaseState") || (cnames[k] == "CmAcmCaseTypeFolder")) {
									searchParam = reportVal2[cnames[k]];
								} else {
									searchParam = reportVal1[cnames[k]];
								}


						}

						if (Array.isArray(tempString)) {
							if (tempString.length == 0) {
								searchParamRefined = searchParam;
							} else {

								for (var s = 0; s < searchParam.length; s++) {
									if (s == searchParam.length - 1) {
										searchParamRefined = searchParamRefined + searchParam[s];
									} else {
										searchParamRefined = searchParamRefined + searchParam[s] + ';';
									}


								}
							}
							tempString = null;
						} else if (searchParam != null) {

							//debugger;
							searchParamRefined = searchParam.paramReplace(",", "");
							//searchParamRefined=searchParam;
						} else {
							//debugger;
							searchParamRefined = searchParam;
						}

						rowElement += searchParamRefined + ",";
						searchParam = "";
						searchParamRefined = "";
					}

					rowElementRefined = rowElement.paramReplace(/null/g, "");
					//rowElementRefined=rowElement;
					return rowElementRefined;


				}
			} catch (exception) {
				console.log("Exception:" + exception);
			}
		},

		//Generating the file with time stamp
		generateFileNameWithTimestamp: function(prefix, ext) {
			var currentDate = new Date();
			var fileName = prefix + currentDate.getFullYear() + "-" + (currentDate.getMonth() + 1) + "-" + currentDate.getDate() + "." + ext;
			return fileName;
		},


		downloadFile: function(fileName, csvContent) {
			var D = document;
			var a = D.createElement('a');
			var strMimeType = 'application/octet-stream;charset=utf-8';
			var rawFile;

			if (navigator.appName.toLowerCase().indexOf("microsoft") > -1) { //IE<10

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

			//html5 A[download]
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
		_eoc_: null

	});
});
