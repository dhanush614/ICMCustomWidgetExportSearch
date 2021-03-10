define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/dom-construct",
	"./_ViewCaseDocumentDetails"	
], //
function(declare, lang, connect, domConstruct, ViewCaseDocumentDetails) {

	return declare(ViewCaseDocumentDetails, {

		name: 'viewSplitCaseDocumentDetails',
		widgetPaneId: null,
		
		getAPIPath: function() {
			return {
				viewSplitCaseDocumentDetails: this
			};
		},

		/**
		 * @private Structure for this view.
		 */
		_getStructure: function() {
			var columns = this.inherited(arguments);
			if (!columns)
				return columns;
			
			// need to use unique Id for checkbox all
			var uniqueId = "split_checkbox_all" + this.widgetPaneId;
			var cbRowId = "split_checkbox_" + this.widgetPaneId;
				
			// Add check box column
			columns.unshift({
					field: "checkbox",
					name: '<input type="checkbox" id="' + uniqueId + '"/>', //"split_checkbox_all"/>',
					//widgetsInCell: true,
					sortable: false,
					width: "20px",
					decorator: lang.hitch(this, function(data, rowId, rowIndex) {
						// show the checkbox in first column for documents
						var item = this.contentList.grid.row(rowId).item();
						var fieldsHTML;
						var boxid;
						//var caseDocWgt = this.caseDoc;
						if (item.mimetype === "folder") {
							fieldsHTML = "&nbsp;" ;
						} else {	
							boxid = "split_checkbox_" + rowIndex;
							fieldsHTML = '<input type="checkbox" id="' + cbRowId +    //split_checkbox_' + this.widgetPaneId +
								+ rowIndex + '" style="margin-top: 1px; margin-bottom: 1px;"';
							
							if (item.isExternalDocument) {
								fieldsHTML += ' disabled="disabled" ';
								var checkall = document.getElementById(uniqueId); //("split_checkbox_all");
								checkall.disabled = true;
							} 
							
							fieldsHTML += '/>';
						}
						return fieldsHTML;
					})				
			});				
			
			// Set columns width
			for (var i = 1; i < columns.length; i ++) {
				var column = columns[i];
				if (column.field === "{NAME}")
					column.width = "15.0em";
				else if (column.field === "LastModifier")
					column.width = "7.0em";
				else if (column.field === "DateLastModified")
					column.width = "10.0em";
			}	
			
			// Set default sorting by name
			var t = this, cl = t.contentList;
			cl._resultSet.sortIndex  = 4;				

			return columns;
		}
		
	});
});
