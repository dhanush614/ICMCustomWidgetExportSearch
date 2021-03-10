/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2010, 2019
 * US Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
define([
	"dojo/_base/declare",
	"dojo/_base/json",
	"dojo/aspect",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/date/stamp",
	"dojo/cookie",
	"dojo/topic",
	"dojox/uuid/generateRandomUuid",
	"ecm/model/_itemUtils",
	"ecm/model/AsyncTaskSchedule",
	"ecm/model/ResultSet",
	"ecm/model/_SharedRequestsMixin",
	"ecm/model/Item",
	"dojo/_base/sniff",
	"ecm/model/SocialItem",
	"ecm/model/ChildComponent"
], function(declare, dojojson, aspect, lang, dojo_array, dojo_stamp, cookie, topic, generateRandomUuid, ItemUtils, AsyncTaskSchedule,ResultSet, _SharedRequestsMixin, Item, has, SocialItem, ChildComponent) {
	/**
	 * Constructs a content item.
	 * 
	 * @param properties
	 *            The properties for the content item. The properties can be any of the public fields as defined below
	 *            and on {@link ecm.model.Item} and {@link ecm.model._ModelObject}.
	 * @name ecm.model.ContentItem
	 * @class Represents a single content item in the repository. Content items include documents, folders, and other
	 *        items. Each content item is associated with a content class that describes the metadata for the item.
	 * @augments ecm.model.Item
	 */
	var ContentItem = declare("icmcustom.model.ContentItem", [
		Item,
		_SharedRequestsMixin, 
		ResultSet
	], {
		/** @lends ecm.model.ContentItem.prototype */

		/**
		 * A string value holding the version series id. (FileNet P8 only)
		 */
		vsId: null,

		/**
		 * A string value holding the item id. (IBM Content Manager only)
		 * 
		 * @since 2.0.3
		 */
		itemId: null,

		/**
		 * The object store containing the FileNet P8 content item.
		 * <p>
		 * <strong>Note:</strong> This object store can be different from the object store that is related to the
		 * repository in cases such as when searches are performed across object stores.
		 * </p>
		 */
		objectStore: null,

		/**
		 * An array of {@link ecm.model.Permission} objects defining access rights on this content item.
		 */
		permissions: null,

		/**
		 * A boolean that is true if this is the root container.
		 */
		rootFolder: false,

		/**
		 * A boolean that is true if the item is the most current version. (FileNet P8 only)
		 */
		currentVersion: false,

		/**
		 * A boolean indicating that the content item is declared as part of a record. The records management can apply
		 * additional restrictions on the document when it is part of a record.
		 */
		declaredAsRecord: false,

		/**
		 * A boolean that is true if this is a FileNet P8 repository. A checkout icon should be shown when this is true
		 * because the item has a reservation.
		 */
		showCheckoutForReservation: false,

		/**
		 * If the content item is updated, this field will contain the id that the item originally had. The id can
		 * change for certain types of updates, such as changing the content class.
		 */
		originalId: null,

		/**
		 * A boolean indicating if the document has a hold applied. (IBM Content Manager OnDemand and IBM Content
		 * Manager only.)
		 */
		hasHold: false,

		/**
		 * If not null, the ContentItem represents a compound document. The value, when not null, indicates the type of
		 * compound document.
		 */
		compoundDocumentType: null,

		/**
		 * The size of the content in bytes, if there is content.
		 * 
		 * @since 2.0.3
		 */
		contentSize: undefined,

		/**
		 * @private Identifies if the document is stored in an external repository.
		 */
		isExternalDocument: false,

		/**
		 * A boolean value indicating if this content item is an instance of a hierarchical item type. (IBM Content
		 * Manager only)
		 * 
		 * @since 2.0.3.5
		 */
		isHierarchicalItemType: false,

		/**
		 * A boolean value indicating if role-based redaction annotations exist for this document. The value is null 
		 * until assigned by calling <code>retrieveAttributes</code>. If support for role-based redaction is not 
		 * enabled in the Navigator repository configuration then this value will always be null.  
		 * 
		 * @since 3.0
		 */
		hasRoleBasedRedactions: null,
		
		/**
		 * When attributes with a choice list are retrieved, this boolean value indicates whether to look up the display name
		 * of the value in the choice list if the openItem service response doesn't include a display name.
		 * 
		 * @since 3.0.7
		 */
		resolveChoiceDisplayName: true,

		/**
		 * @deprecated Deprecated in 2.0.3. The Item model privModifyPermissions should be used instead.
		 */
		modifyPermissions: false,

		boxShareRecords: null,

		_previewThumbnail: null,

		_shareStatus: null,

		/**
		 * @private
		 */
		constructor: function() {
			this.rootFolder = this.rootfolder;
			delete this.rootfolder;
		},

		/**
		 * @private Returns the object store of the FileNet P8 content item.
		 */
		getObjectStore: function() {
			if (!this.objectStore) {
				this.objectStore = this.objectStoreId ? {
					id: this.objectStoreId,
					symbolicName: this.objectStoreName,
					displayName: this.objectStoreDisplayName,
					capabilityComment: this.capabilityComment,
					supportsDownloadCount: this.supportsDownloadCount,
					supportsRecommendation: this.supportsRecommendation,
					supportsTag: this.supportsTag,
					supportsBoxShare: this.supportsBoxShare
				} : null;
			}

			return this.objectStore;
		},

		/**
		 * Returns an instance of {@link ecm.model.ContentClass} for the content class that is associated with this
		 * content item.
		 */
		getContentClass: function() {
			if (!this.template) {
				return null;
			}
			var cls = this.repository.getContentClass(this.template, this.objectStore);
			// update the class display name, usually it is initialized with the id (sym name), which is not always the same
			if (this.template_label) {
				cls.name = this.template_label;
			}
			return cls;
		},

		/**
		 * Returns true if this item has content.
		 */
		hasContent: function() {
			if (this.mimetype == null) {
				this.mimetype = "";
			}
			var hasContentValue = !this.isFolder() && !this.dataObject && !ecm.model.ContentItem.NoContentMimeTypes[this.mimetype];
			if (hasContentValue && this.repository._isP8() && this.attributes.ContentElementsPresent) {
				hasContentValue = this.attributes.ContentElementsPresent.length > 0;
			}
			if (!hasContentValue && this.contentSize) {
				hasContentValue = this.contentSize > 0;
			}
			return hasContentValue;
		},

		/**
		 * Returns true if this item is viewable.
		 */
		isViewable: function() {
			// CM "item" items (no content), entry templates, and some other MIME classes are not viewable.
			return (!this.repository || this.repository.type != "cm" || this.mimetype != "item") && !this.isFolder() && !this.isDocumentEntryTemplate() && !this.isFolderEntryTemplate() && !this.isDeclareRecordEntryTemplate() && !ecm.model.ContentItem.NotViewableMimeClasses[this.getMimeClass()];
		},

		/**
		 * Returns true if the item is a system object.
		 */
		isSystemItem: function() {
			var systemItem = ecm.model.ContentItem.SystemItemMimeTypes[this.mimetype];
			return systemItem ? systemItem : this.isInstanceOf && this.isInstanceOf(ecm.model._SearchTemplateBase);
		},

		/**
		 * Returns true if the specified attribute is hidden.
		 */
		isAttributeHidden: function(attributeId) {
			var hidden = false;
			if (this.repository.type == "od") {
				// Hide full text attributes
				var type = this.attributeTypes[attributeId];
				if (type === "xs:highlight" || type === "xs:score" || type === "xs:summary")
					hidden = true;
			}

			return hidden;
		},

		/**
		 * Returns true if the specified child component is hidden.
		 */
		isChildComponentHidden: function(childComponentId) {
			return false;
		},

		/**
		 * Retrieves all attributes for the item. Depending on how the item was originally created, it might contain
		 * only a subset of the attributes. This function will retrieve any additional missing attributes.
		 * 
		 * @param callback
		 *            A function that is called when the attribute retrieve has completed.
		 * @param backgroundRequest
		 *            A boolean value indicating whether this request should be run in the background (can be null).
		 * @param noOnChange
		 *            A boolean value indicating whether onChange should be run after retrieving the item's attributes
		 *            (can be null).
		 * @param onError
		 * @since 2.0.3 A callback function called if there is an error returned from the request.
		 * @param retrieveSecurityPolicy 
		 *        A boolean value to indicate if security policy should be retrieved. 
		 *        When the security policy uses a large number of security templates, this may take some time.
		 * @param version 
		 *        Optional for documents, a boolean value to indicating the version option.
		 * @since 2.0.3.8	  
		 */
		retrieveAttributes: function(callback, backgroundRequest, noOnChange, onError, retrieveSecurityPolicy, version) {
			this.logEntry("retrieveAttributes");

			var templateName;
			if (!this.template && this.id && this.repository && this.repository._isP8()) {
				this.template = this.id.split(",", 1)[0];
			}

			var params = {
				desktop: ecm.model.desktop.id,
				repositoryId: this.repository.id,
				docid: this.id,
				alt_output: "JSON",
				retrieveSecurityPolicy: retrieveSecurityPolicy ? retrieveSecurityPolicy : false,
				template_name: this.template
			};

			if (version) {
				params.version = version;
				params.vsId = this.vsId;
			}

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}
			
			// If this is an OD document, request the application group data unless it's in cache
			if (this.repository._isOnDemand() && this.application_group)
				params.odGetAppGrpUpdateable = !this.repository._appGroupCache || !this.repository._appGroupCache[this.application_group];

			var sharedRequestParams = {
				sharedRequestMethod: "retrieveAttributes",
				sharedRequestCompleteCallback: callback,
				sharedRequestFailedCallback: onError,
				serviceName: "openItem",
				repositoryType: this.repository.type,
				requestParams: params,
				requestCompleteCallback: lang.hitch(this, function(response) {
					this._retrieveAttributesCompleted(response, noOnChange, sharedRequestParams);
				}),
				requestFailedCallback: lang.hitch(this, function(response, errorMessages) {
					this.failSharedRequest(sharedRequestParams, lang.hitch(this, function(callback) {
						callback(response, errorMessages);
					}));
				}),
				backgroundRequest: (backgroundRequest || (backgroundRequest == null))
			};
			var request = this.invokeSharedRequest(sharedRequestParams);

			this.logExit("retrieveAttributes");
			return request;
		},

	
		
		_retrieveAttributesCompleted: function(response, noOnChange, sharedRequestParams) {
			this.logEntry("_retrieveAttributesCompleted");
			this._attributesRetrieved = true;

			// Update the item properties
			for ( var prop in response) {
				if (response.hasOwnProperty(prop) && prop != "criterias" && prop != "systemProperties" && (!this.rootFolder || prop != 'name')) {
					this[prop] = response[prop];
				}
			}

			// Object and array valued properties are initialized in the ecm.model.Item constructor.
			for ( var i in response.criterias) {
				var attribute = response.criterias[i];
				var attributeId = attribute.name;	
			
				this.attributes[attributeId] = attribute.values;
				if (attribute.label || attribute.label == "") {
					this.attributeLabels[attributeId] = attribute.label;
				}
				if (attribute.dataType || attribute.dataType == "") {
					this.attributeTypes[attributeId] = attribute.dataType;
				}
				if (attribute.format || attribute.format == "") {
					this.attributeFormats[attributeId] = attribute.format;
				}
				if (attribute.displayValue || attribute.displayValue == "") {
					this.attributeDisplayValues[attributeId] = attribute.displayValue;
				} else if (this.resolveChoiceDisplayName && attribute.choiceList) {
					var newValue = [];
					ItemUtils.lookupChoiceList(attribute.values, attribute.choiceList, newValue);
					if (newValue && newValue.length >= 1) {
						if (lang.isArray(attribute.values))
							attribute.displayValue = newValue;
						else
							attribute.displayValue = newValue[0];
					}
					this.attributeDisplayValues[attributeId] = attribute.displayValue;
				} 
							
				this.attributeReadOnly[attributeId] = (attribute.readOnly === true) ? true : false;
				if (attribute.objectValues) {
					this.attributeItems[attributeId] = ecm.model.ContentItem.createFromJSON(attribute.objectValues[0], this.repository, null);
				}
				if (attribute.valueTimeZoneOffset || attribute.valueTimeZoneOffset === 0) {
					this.attributeValueTimeZoneOffsets[attributeId] = attribute.valueTimeZoneOffset;
				}
				
				// Update the choice list if it comes from EDS
				if (attribute.updatedChoiceList) {
					if (!this.attributeChoiceLists)
						this.attributeChoiceLists = [];
					this.attributeChoiceLists[attributeId] = {
						choiceList: attribute.choiceList
					};
				}
			}

			// Update the name.
			if (this.attributes && this.attributes.hasOwnProperty("{NAME}") && !this.rootFolder) {
				this.name = this.attributes["{NAME}"] ? this.attributes["{NAME}"] : "";
			}

			for ( var i in response.systemProperties) {
				var attribute = response.systemProperties[i];
				var attributeId = attribute.name;
				this.attributeLabels[attributeId] = attribute.label;
				this.attributes[attributeId] = attribute.values;
				if (attribute.label || attribute.label == "") {
					this.attributeLabels[attributeId] = attribute.label;
				}
				if (attribute.dataType || attribute.dataType == "") {
					this.attributeTypes[attributeId] = attribute.dataType;
				}
				if (attribute.format || attribute.format == "") {
					this.attributeFormats[attributeId] = attribute.format;
				}
				if (attribute.displayValue || attribute.displayValue == "") {
					this.attributeDisplayValues[attributeId] = attribute.displayValue;
				}
				if (attribute.userInfo) {
					this.attributeUserInfo[attributeId] = attribute.userInfo;
				}
				if (attribute.valueTimeZoneOffset || attribute.valueTimeZoneOffset === 0) {
					this.attributeValueTimeZoneOffsets[attributeId] = attribute.valueTimeZoneOffset;
				}
				this.attributeSystemProperty[attributeId] = "true";
				if (attribute.objectValues) {
					this.attributeItems[attributeId] = ecm.model.ContentItem.createFromJSON(attribute.objectValues[0], this.repository, null);
				}
			}

			this._childComponents = [];
			for ( var i in response.parm_childcomponents) {
				var childComponentItem = new ChildComponent(response.parm_childcomponents[i]);
				this._childComponents.push(childComponentItem);
			}

			this.templateMetadata = [];
			for ( var i in response.templateMetadata) {
				var templateMetadata = new TemplateMetadata(response.templateMetadata[i], this.repository);
				this.templateMetadata.push(templateMetadata);
			}

			if (response.parm_securitypolicy) { // P8 Security Policy
				this._securityPolicy = new ecm.model.SecurityPolicy(response.parm_securitypolicy);
			}

			if (response.filename) { // P8 External Document URL
				this.filename = response.filename;
			}

			// Note: Permissions are not retrieved as part of the openItem request.   Instead, they are retrieved
			// separately (see getPermissions).

			// save class name for later
			this.template_label = response.template_label;

			this.mySocialData = dojo_array.map(response.mySocialData, lang.hitch(this, function(datum) {
				return SocialItem.createFromJSON(datum, this, null);
			}));

			// Added for backwards compatibility with old "modifyPermissions" boolean flag. Will be removed in the future.
			if (response.modifyPermissions != undefined) {
				this.modifyPermissions = response.modifyPermissions === true || response.modifyPermissions === "true" || false;
				if (this.modifyPermissions) {
					this.privileges |= ecm.model.Item.PrivilegeToBitmask["privModifyPermissions"];
				} else { // Clear modify permissions bit
					this.privileges &= ~ecm.model.Item.PrivilegeToBitmask["privModifyPermissions"];
				}
			}
			delete this.accessMaskNotRetrieved; // The access mask is retrieved

			if (noOnChange == undefined || noOnChange == false) {
				try {
					this.onChange([
						this
					]);
				} catch (e) {
					// Trap and ignore any onChange handling errors so that the callbacks are processed.
				}
			}

			this.completeSharedRequest(sharedRequestParams, lang.hitch(this, function(callback) {
				callback(this);
			}));

			this.logExit("_retrieveAttributesCompleted");
		},

		/**
		 * Returns an instance of {@link ecm.model.ChildComponent} for the specified child component.
		 * 
		 * @param id
		 *            The identifier of the child component.
		 */
		getChildComponent: function(id) {
			if (this._childComponents) {
				for ( var i in this._childComponents) {
					var childComponent = this._childComponents[i];
					if (childComponent.id == id) {
						return childComponent;
					}
				}
			}
			return null;
		},

		/**
		 * Retrieves all values for a specified child component.
		 * 
		 * @param childName
		 *            A string value holding the child name to retrieve.
		 * @param callback
		 *            A function that is called when the child component retrieval has completed.
		 */
		retrieveChildComponent: function(childName, callback) {
			this.logEntry("retrieveChildComponent");
			var self = this;

			var params = {
				desktop: ecm.model.desktop.id,
				repositoryId: this.repository.id,
				docid: self.id,
				child_name: childName,
				template_name: self.template
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}

			var request = ecm.model.Request.invokeService("getChildComp", this.repository.type, params, function(response) {
				self._retrieveChildComponentCompleted(response, callback);
			}, null, null, null, false); // set background is false to prevent status dialog blurring the popup
			this.logExit("retrieveChildComponent");
			return request;
		},

		_retrieveChildComponentCompleted: function(response, callback) {
			this.logEntry("_retrieveChildComponentCompleted");
			var childComponentItem = null;
			if (response.parm_childcomponents && response.parm_childcomponents.length > 0) {
				childComponentItem = new ChildComponent(response.parm_childcomponents[0]);
			}
			//this.onChange([ this ]);
			if (callback) {
				callback(childComponentItem);
			}
			this.logExit("_retrieveChildComponentCompleted");
		},

		addRelated: function(templateName, attributes, permissions, children, parents, callback, errorCallback) {
			var methodName = "addReference";
			this.logEntry(methodName);

			var request = null;

			if (this.repository.type == "p8") {
				var objectStore = this.getObjectStore();

				var args = {
					desktop: ecm.model.desktop.id,
					repositoryId: this.repository.id,
					workspaceId: null,
					parm_content_source_type: "reference",
					docid: this.id,
					template_name: templateName
				};

				args.securityPolicyId = null;
				args.objectStoreId = objectStore ? objectStore.id : "";
				var data = [
					{
						criterias: attributes,
						acl: permissions,
						children: this._convertReferenceItems(children),
						parents: this._convertReferenceItems(parents)
					}
				];

				request = ecm.model.Request.postService("addRelated", this.repository.type, args, "text/json", JSON.stringify(data), lang.hitch(this, function(response) {
					this._addRelatedCompleted(response, callback);
				}), null, null, null, lang.hitch(this, function(response) {
					this._addRelatedCompleted(response, errorCallback);
				}));
			} else {
				// TODO:  Add error processing - compoundDocumentType is not specified for this item.	
			}

			this.logExit(methodName);
			return request;
		},

		_addRelatedCompleted: function(response, callback) {
			this.logEntry("_addRelatedCompleted");
			if (response.fieldErrors || response.errors) {
				if (callback) {
					callback(response);
				}
			} else {
				if (callback) {
					if (response.rows.length > 0) {
						response.repository = this.repository;
						response.parentDocument = this;
						var resultSet = ContentItem.createResultSet(response);
						callback(response, resultSet);
					} else {
						callback(response);
					}
				}
			}
			this.logExit("_addRelatedCompleted");
		},

		_convertReferenceItems: function(items) {
			var returnItems = [];
			if (items && lang.isArray(items)) {
				for (var n = 0; n < items.length; items++) {
					if (typeof items[n] == "string") {
						returnItems.push(items[n]);
					} else if (items[n].id) {
						returnItems.push(items[n].id);
					}
				}
			}

			return returnItems;
		},

		/**
		 * Removes any cached related items so that they will be retrieved from the server on the next call to
		 * <code>retrieveRelated</code>. This differs from refresh in that an <code>onChange</code> event is not
		 * fired. It is usually used in situations where the related items have known to have changed but the item
		 * itself is not visible.
		 */
		unloadRelated: function() {
			this._related = null;
		},

		/**
		 * Retrieves compound document related items. This call can be used to retrieve parents or children of a
		 * compound document, and can return either related document ContentItems or related Reference items. The
		 * response passed to the callback will contain a ResultSet of the related items or references, depending on how
		 * the function was called.
		 * 
		 * @param relationship
		 *            Specify either "parents" or "children". If omitted or set to any other value, "children" will be
		 *            assumed.
		 * @param resultType
		 *            Specify either "items", "cds" or "references". If omitted or set to any other value, "items" will
		 *            be assumed.
		 * @param callback
		 *            Function to call on successful completion of the request.
		 * @param errorCallback
		 *            Function to call on failed completion of the request.
		 * @since 2.0.3
		 */
		retrieveRelated: function(relationship, resultType, callback, errorCallback, noCache) {
			this.logEntry("retrieveRelated");
			var self = this;

			if (!this._related) {
				this._related = new Object();
			}

			var params = {
				desktop: ecm.model.desktop.id,
				repositoryId: this.repository.id,
				docid: self.id,
				relationship: relationship,
				resultType: resultType
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";

				if (this.vsId != null) {
					params.vsId = this.vsId;
				}

				var version = this._getSearchVersion();
				if (version != null) {
					params.version = version;
				}
			}

			var request = null;
			var cacheKey = relationship + "." + resultType;
			if (!noCache && this._related[cacheKey]) {
				if (callback) {
					callback(this._related[cacheKey]);
				}
			} else {
				request = ecm.model.Request.invokeService("retrieveRelated", this.repository.type, params, function(response) {
					self._retrieveRelatedCompleted(response, callback, noCache, cacheKey, relationship, resultType);
				}, null, null, function(response) {
					self._retrieveRelatedCompleted(response, errorCallback, noCache, cacheKey, relationship, resultType);
				}, false); // set background is false to prevent status dialog blurring the popup
			}

			this.logExit("retrieveRelated");
			return request;
		},

		_retrieveRelatedCompleted: function(response, callback, noCache, cacheKey, relationship, resultType) {
			if (response.errors && response.errors.length > 0) {
				if (callback) {
					callback(response);
				}
			} else {
				response.repository = this.repository;
				if (relationship == "parents") {
					response.childDocument = this;
				} else {
					response.parentDocument = this;
				}
				response.relationship = relationship;
				response.resultType = resultType;
				var resultSet = ContentItem.createResultSet(response);
				if (!noCache) {
					this._related[cacheKey] = resultSet;
				}
				if (callback) {
					callback(resultSet);
				}
			}
		},

		/**
		 * Removes one or more items from this folder.
		 * 
		 * @param items
		 *            An item Id string, an array of item Id strings, an item object, or an array of item objects.
		 * @param folderRemoveCallback
		 *            A callback function that is invoked once the action is complete.
		 */
		removeFromFolder: function(items, folderRemoveCallback) {
			this.logEntry("removeFromFolder");

			var itemIds = [];
			if (items instanceof String) {
				itemIds.push(items);
			} else if (lang.isArray(items)) {
				for ( var i in items) {
					var item = items[i];
					if (item instanceof String) {
						itemIds.push(item);
					} else {
						itemIds.push(item.id);
					}
				}
			} else {
				itemIds.push(items.id);
			}

			var params = {
				repositoryId: this.repository.id,
				docid: itemIds,
				folderDocid: this.id,
				template_name: this.template
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}

			var request = ecm.model.Request.invokeService("removeFromFolder", this.repository.type, params, lang.hitch(this, function(response) {
				this.repository.addRecentItems(items);
				this._removeFromFolderCompleted(response, folderRemoveCallback);
			}));
			this.logExit("removeFromFolder");
			return request;
		},

		_removeFromFolderCompleted: function(response, folderRemoveCallback) {
			this.logEntry("_removeFromFolderCompleted");
			if (folderRemoveCallback) {
				folderRemoveCallback();
			}
			this.refresh(this);
			this.logExit("_removeFromFolderCompleted");
		},

		/**
		 * Adds one or more items to this folder.
		 * 
		 * @param items
		 *            An item Id string, an array of item Id strings, an item object, or an array of item objects.
		 * @param folderAddCallback
		 *            A callback function that is invoked once the action is complete.
		 */
		addToFolder: function(items, folderAddCallback) {
			this.logEntry("addToFolder");

			var itemIds = [];
			if (items instanceof String) {
				itemIds.push(items);
			} else if (lang.isArray(items)) {
				for ( var i in items) {
					var item = items[i];
					if (item instanceof String) {
						itemIds.push(item);
					} else {
						itemIds.push(item.id);
					}
				}
			} else {
				itemIds.push(items.id);
			}

			var params = {
				repositoryId: this.repository.id,
				docid: itemIds,
				folderDocid: this.id,
				template_name: this.template
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}

			var request = ecm.model.Request.invokeService("addToFolder", this.repository.type, params, lang.hitch(this, function(response) {
				this.repository.addRecentItems(items);
				this._addToFolderCompleted(response, folderAddCallback);
			}));
			this.logExit("addToFolder");
			return request;
		},

		_addToFolderCompleted: function(response, folderAddCallback) {
			this.logEntry("_addToFolderCompleted");
			if (folderAddCallback) {
				folderAddCallback();
			}
			this.refresh(this);
			this.logExit("_addToFolderCompleted");
		},

		/**
		 * Copies one or more items to this folder.
		 * 
		 * @param items
		 *            An item Id string, an array of item Id strings, an item object, or an array of item objects.
		 * @param callback
		 *            A callback function that is invoked once the action is complete.
		 * @param destinationRepositoryId
		 *            An optional source repository Id.
		 * @param templateName
		 *            An optional Class name to used for new items.
		 */
		copyToFolder: function(items, callback, sourceRepositoryId, templateName) {
			this.logEntry("copyToFolder");

			var itemIds = [];
			if (items instanceof String) {
				itemIds.push(items);
			} else if (lang.isArray(items)) {
				for ( var i in items) {
					var item = items[i];
					if (item instanceof String) {
						itemIds.push(item);
					} else {
						itemIds.push(items[i].id);
					}
				}
			} else {
				itemIds.push(items.id);
			}

			var params = {
				repositoryId: this.repository.id,
				itemIds: itemIds,
				folderDocid: this.id,
				template_name: this.template
			};

			var request = ecm.model.Request.invokeService("copyToFolder", this.repository.type, params, lang.hitch(this, function(response) {
				this.repository.addRecentItems(items);
				this._copyToFolderCompleted(response, callback);
			}));

			this.logExit("copyToFolder");
			return request;
		},

		_copyToFolderCompleted: function(response, callback) {
			this.logEntry("_copyToFolderCompleted");
			if (callback) {
				callback();
			}
			this.refresh(this);
			this.logExit("_copyToFolderCompleted");
		},

		/**
		 * Moves one or more items to this folder.
		 * 
		 * @param items
		 *            An item Id string, an array of item Id strings, an item object, or an array of item objects.
		 * @param oldFolder
		 *            An {@link ecm.model.ContentItem} object for the current folder containing the items to be moved.
		 * @param moveCallback
		 *            A callback function that is invoked once the action is complete.
		 * @param permissions
		 *            An optional array of {@link ecm.model.Permission} objects to be applied the item after the move.
		 * @param inheritSecurity
		 *            An optional boolean to indicate if the item should inherit security from it's parent folder after
		 *            the move.
		 */
		moveToFolder: function(items, oldFolder, moveCallback, permissions, inheritSecurity) {
			this.logEntry("moveToFolder");

			if (this.id != oldFolder.id) {

				var itemIds = [];
				if (items instanceof String) {
					itemIds.push(items);
				} else if (lang.isArray(items)) {
					for ( var i in items) {
						var item = items[i];
						if (item instanceof String) {
							itemIds.push(item);
						} else {
							itemIds.push(item.id);
						}
					}
				} else {
					itemIds.push(items.id);
				}

				var params = {
					repositoryId: this.repository.id,
					docid: itemIds,
					folderDocid: oldFolder.id,
					newFolderDocid: this.id,
					newFolderIsTeamspaceFolder: this.isTeamspaceSubFolder != null ? this.isTeamspaceSubFolder : false,
					template_name: this.template,
					inheritSecurity: inheritSecurity,
					permissions: permissions != null ? dojojson.toJson(permissions) : null
				};

				if (this.repository._isP8()) {
					params.objectStoreId = this.objectStore ? this.objectStore.id : "";
				}

				var request = ecm.model.Request.invokeService("moveToFolder", this.repository.type, params, lang.hitch(this, function(response) {
					this.repository.addRecentItems(items);
					this._moveToFolderCompleted(response, oldFolder, moveCallback);
				}));
			}

			this.logExit("moveToFolder");
			return request;
		},

		_moveToFolderCompleted: function(response, oldFolder, moveCallback) {
			this.logEntry("_moveToFolderCompleted");
			if (moveCallback) {
				moveCallback();
			}
			oldFolder._moveToFolder = this; //this.refresh(this);
			oldFolder.refresh(oldFolder);
			this.logExit("_moveToFolderCompleted");
		},

		/**
		 * Returns true if this folder's contents have been retrieved.
		 * 
		 * @param filterType
		 *            A string value holding the filter type for retrieving folder contents
		 */
		isFolderContentsRetrieved: function(filterType) {
			return this._folderContents && this._folderContents[filterType || ""];
		},

		/**
		 * If found, deletes the provided item from the folder's content cache based on the filter type.
		 * 
		 * @param item
		 *            The item to be deleted.
		 * @param filterType
		 *            The type of cache stored.
		 */
		deleteItemFromFolderContentCache: function(item, filterType) {
			if (this._folderContents) {
				var resultSet = this._folderContents[filterType || ""];
				if (resultSet)
					resultSet.deleteItem(item);
			}
		},

		/**
		 * Erases any cached contents and triggers <code>onChange</code>, causing this item to be refreshed in any
		 * widgets.
		 */
		refresh: function() {
			this.logEntry("refresh");
			this._folderContents = null;
			this._related = null;
			this._previewThumbnail = null;
			this.onChange(this);
			this.logExit("refresh");
		},

		/**
		 * Removes any cached folder contents so that they will be retrieved from the server on the next call to
		 * <code>retrieveFolderContents</code>. This differs from refresh in that an <code>onChange</code> event is
		 * not fired. It is usually used in situations where the folder contents have known to have changed but the
		 * folder itself is not visible.
		 */
		unloadFolderContents: function() {
			this._folderContents = null;
		},

		/**
		 * Retrieves the contents of this folder.
		 * 
		 * @param folderOnly
		 *            Only the nested folders are retrieved.
		 * @param callback
		 *            A function, invoked with a {@link ecm.model.ResultSet} result set, which provides access to the
		 *            folder contents. If the retrieve fails due to errors, the callback is called with an empty result set
		 *            that includes the array of errors in the errors property. The error will also be displayed to the user.
		 * @param orderBy
		 *            The attribute ID of the attribute by which to sort the contents, if any.
		 * @param descending
		 *            If true, then sorting will be in descending order.
		 * @param noCache
		 *            If true, then the contents will not be cached.
		 * @param teamspaceId
		 *            If working in a teamspace context, the teamspace ID.
		 * @param filterType
		 *            Filters the contents (supersedes <code>foldersOnly</code>).
		 * @param parent
		 *            A parent folder {@link ecm.model.ContentItem} object.
		 * @param criteria
		 *            An object hold the filter critieria.
		 */
		retrieveFolderContents: function(foldersOnly, callback, orderBy, descending, noCache, teamspaceId, filterType, parent, criteria) {
			// summary:
			// retrieve the folder's contents
			this.logEntry("retrieveFolderContents");
			if (!filterType) {
				filterType = foldersOnly ? "folderSearch" : "";
			}
			if (teamspaceId) {
				this._teamspaceId = teamspaceId;
			}

			if (!this._folderContents) {
				this._folderContents = new Object();
			}

			if (!noCache && this._folderContents[filterType]) {
				callback(this._folderContents[filterType]);
			} else {
				var params = {
					repositoryId: parent.repository.id,
					docid: parent.id,
					workspaceId: parent._teamspaceId,
					filter_type: filterType,
					name: parent.name
				};

				if (this._resultSet.repository._isP8()) {
					params.objectStoreId = parent.objectStore ? parent.objectStore.id : "";
				}

				if (orderBy) {
					params.order_by = orderBy;

					if (descending) {
						params.order_descending = "true";
					}
				}

				if (criteria) {
					params.criterias = JSON.stringify(criteria);
				}

				var type = parent.repository.type;

				var request = ecm.model.Request.invokeService("openFolder", type, params, lang.hitch(this, function(response) {
					this._retrieveFolderCompleted(response, filterType, noCache, teamspaceId, parent, callback);
				}), false, false, lang.hitch(this, function(errResponse) {
					// An error response should display an error to the user, but we also need to return the empty result set
					// error response to clear the results. Also indicate that the error result set should not be cached.
					this._retrieveFolderCompleted(errResponse, filterType, true, teamspaceId, parent, callback);
				}));
			}

			this.logExit("retrieveFolderContents");
			return request;
		},

		_retrieveFolderCompleted: function(response, filterType, noCache, teamspaceId, parent, callback) {
			this.logEntry("retrieveFolderCompleted");

			var parentItem = parent ? parent : this;
			response.repository = parent.repository;
			response.parentFolder = parentItem;
			response.teamspaceId = teamspaceId;

			var createResultSet = function(response) {
				return new ResultSet(response);
			};
			
			ContentItem.createResultSet = createResultSet;
			var resultSet = ContentItem.createResultSet(response);
	
			var parent=this._resultSet
			
			for ( var i in this._resultSet.items) {
				
			
				if(resultSet.docid==this._resultSet.items[i].id)
				{
					if(!this._resultSet.items[i].children)
						this._resultSet.items[i].children=[];
					//for ( var j in resultSet.items) {
					
						this._resultSet.items[i].children=resultSet.items;
				}
				else
				{
					for ( var k in this._resultSet.items[i].children)
					{
						if(resultSet.docid==this._resultSet.items[i].children[k].id)
						{
						if(!this._resultSet.items[i].children[k].children)
						this._resultSet.items[i].children[k].children=[];
						this._resultSet.items[i].children[k].children=resultSet.items;
			
					}
						
				}
					
				}

			}
			//this.grid.setStore(this._resultSet.getStore());
			
			this.appendResultSet(this._resultSet);
			//this.setResultSet(this._resultSet);
			/*if (!noCache && this._folderContents) {
				this._folderContents[filterType] = resultSet;
			}*/
			callback(resultSet);

			this.logExit("retrieveFolderCompleted");

		},

		/**
		 * Retrieves all items under the specified folder to the specified depth.
		 * 
		 * @param parent
		 *            The parent folder {@link ecm.model.ContentItem} object.
		 * @param callback
		 *            A function, invoked with a list of {@link ecm.model.ResultSet} result sets, which provides access
		 *            to the folder contents.
		 * @param params
		 *            An Object containing parameters for the retrieval request(s). Parameters include:
		 *            <ul>
		 *            <li>depth - The depth to travse within the folder tree.</li>
		 *            <li>foldersOnly - Only the nested folders are retrieved.</li>
		 *            <li>callback - </li>
		 *            <li>orderBy - The attribute ID of the attribute by which to sort the contents, if any.</li>
		 *            <li>descending - If true, then sorting will be in descending order.</li>
		 *            <li>teamspaceId - If working in a teamspace context, the teamspace ID.</li>
		 *            <li>filterType - Filters the contents (supersedes <code>foldersOnly</code>).</li>
		 *            <li>criteria - An object hold the filter critieria.</li>
		 *            <li>pageSize - Number of items to retrieve per page.</li>
		 *            </ul>
		 */
		retrieveAllItemsAndSubFolders: function(parent, callback, params) {
			this.logEntry("retrieveAllItemsAndSubFolders");
			if (!params.pageSize)
				params.pageSize = 200;
			if (!params.resultSets)
				params.resultSets = [];
			if (!params.depth)
				params.depth = 2;

			this.logDebug("retrieveAllItemsAndSubFolders", "Depth=" + params.depth);
			this.logDebug("retrieveAllItemsAndSubFolders", "Retrieving folder contents from parent=" + parent.name);

			this.retrieveFolderContents(params.foldersOnly, lang.hitch(this, function(resultSet) {
				params.resultSets.push({
					parentId: parent.id,
					parentName: parent.name,
					resultSet: resultSet
				});

				if (params.depth >= 2) {
					this.logDebug("retrieveAllItemsAndSubFolders", "Depth is greater or equal to 2, so we will retrieve all sub-folders found under folder " + parent.name);
					var self = this;
					params.depth = params.depth - 1;

					resultSet.getItems(function(items) {
						// Loop over every item, looking for folders to retrieve.
						dojo_array.forEach(items, function(item, i) {
							if (item.isFolder()) {
								self.logDebug("retrieveAllItemsAndSubFolders", "Found a folder; Retrieving folder contents...");
								self.retrieveAllItemsAndSubFolders(item, function() {
									self.logDebug("retrieveAllItemsAndSubFolders", "Returned from retrieving folder=" + item.name);
								}, params);
							}
						});
					}, params.pageSize);
				}

				callback(params.resultSets);
			}), params.orderBy, params.descending, false, params.teamspaceId, params.filterType, parent, params.criteria);

			this.logExit("retrieveAllItemsAndSubFolders");
		},

		retrieveProcessInformation: function(callback) {
			this.logEntry("retrieveProcessInformation");
			var params = {
				repositoryId: this.repository.id,
				docId: this.id,
				template: this.template
			};
			if (this.repository.type == "cm") {
				var request = ecm.model.Request.invokeService("getItemProcessInformation", this.repository.type, params, lang.hitch(this, function(response) {
					this._retrieveProcessInformationCompleted(response, callback);
				}));
			}

			this.logExit("retrieveProcessInformation");
			return request;
		},

		_retrieveProcessInformationCompleted: function(response, callback) {
			this.logEntry("_retrieveProcessInformationCompleted");
			if (callback) {
				callback(response);
			}
			this.logExit("_retrieveProcessInformationCompleted");
		},

		/**
		 * Updates the attribute values of this item. The attributes are saved to the repository.
		 * 
		 * @param attributes
		 *            An object containing the attribute values, keyed by attribute identifier.
		 * @param newTemplatename
		 *            The new content class for the content item.
		 * @param childComponentValues
		 *            The child component values to be save. (IBM Content Manager only)
		 * @param permissions
		 *            The permissions to be saved
		 * @param checkIn
		 *            A boolean value indicating whether this operation should check in the item.
		 * @param callback
		 *            A function that is invoked after the attributes have been updated. If errors are found with the
		 *            attribute values, an object is passed to this callback which indicates the field, error message,
		 *            and values in error.
		 * @param isBackgroundRequest
		 *            A boolean flag indicating that this add request should be placed in a background process.
		 * @param onError
		 *            A callback function that is called if there is an error returned when updating this item.
		 * @params An object holding extra information to be posted on the save attributes request (@since 2.0.3.6)
		 */
		saveAttributes: function(attributes, newTemplateName, childComponentValues, permissions, checkIn, callback, isBackgroundRequest, onError, params) {
			this.logEntry("saveAttributes");

			// Ignore additional attempts to save attributes on this item if a save is already in progress.
			if (this._savingAttributes) {
				return;
			}
			this._savingAttributes = true;

			var data;
			if (this.repository.type == "od") {
				data = attributes;
			} else if (this.repository.type == "cm") {
				data = [
					{
						criterias: attributes,
						childComponentValues: childComponentValues,
						acl: permissions
					}
				];
			} else { // all others, p8, cmis, plugin
				data = [
					{
						criterias: attributes,
						acl: permissions
					}
				];
			}

			// Check for any extra metadata tempalte information to be added to the post request
			var templatesUpdated = false;
			if (params && params.templateMetadata && params.templateMetadata.length) {
				data[0].templateMetadata = params.templateMetadata;
				templatesUpdated = true;
			}

			var params = {
				repositoryId: this.repository.id,
				docid: this.id,
				desktop: ecm.model.desktop.id,
				childComponentValues: JSON.stringify([]),
				criterias: "",
				new_template_name: newTemplateName ? newTemplateName : this.template,
				template_name: this.template
			};

			if (checkIn) {
				params.parm_checkIn = true;
			}

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}
			
			if (this.repository._isCM() && this.resultSet && this.resultSet.showChildComponentAttribute) {
				params.showChildComponentAttribute = this.resultSet.showChildComponentAttribute;
			}

			var request;

			var onSaveAttributesRequestCompletedConnect = this.own(aspect.after(ecm.model.desktop, "onRequestCompleted", lang.hitch(this, function(completedRequest) {
				if (!request || !request.isSameRequestAs(completedRequest)) {
					return;
				}
				delete this._savingAttributes;
				onSaveAttributesRequestCompletedConnect.remove();
			})));

			request = ecm.model.Request.postService("editAttributes", this.repository.type, params, "text/json", JSON.stringify(data), lang.hitch(this, function(response) {
				delete this._savingAttributes;
				if (response.messages) {
					// This section is added for P8 markings support.  A change in the value of a marking property may cause the document to
					// no longer be accessible.  This is expected behavior, so we do not show an error dialog.  Instead we show a message in the
					// status bar at the bottom.  We also want to update the list view to remove the modified item, as is done below when error 1078
					// is received after modifying permissions.
					for ( var i in response.messages) {
						var message = response.messages[i];
						// User doesn't have access to the document anymore or it has been deleted by another user so remove the item from the result list
						if (message.number == 1156) {
							this.deleted = true;
							this.repository.onChange([
								this
							]);
						}
					}
				}
				this._saveAttributesCompleted(response, newTemplateName && newTemplateName != this.template ? true : false, callback, templatesUpdated);
			}), false, isBackgroundRequest ? isBackgroundRequest : false, false, onError ? onError : lang.hitch(this, function(response) {

				delete this._savingAttributes;
				if (response.errors) {
					for ( var i in response.errors) {
						var error = response.errors[i];
						// User doesn't have access to the document anymore or it has been deleted by another user so remove the item from the result list
						if (error.number == 1078) {
							this.deleted = true;
							this.repository.onChange([
								this
							]);
						}
					}
				}
				//let the receiver do something with the response
				if (callback) {
					callback(response);
				}
			}));

			if (!request) {
				connect.disconnect(onSaveAttributesRequestCompletedConnect);
				delete this._savingAttributes;
			}

			this.logExit("saveAttributes");
			return request;
		},

		_saveAttributesCompleted: function(response, isReindex, callback, templatesUpdated) {
			this.logEntry("_saveAttributesCompleted");

			if (response.fieldErrors) {
				if (callback) {
					callback(response, isReindex);
				}
			} else if (response.rows && response.rows.length > 0) {
				// Get the new item id, item name, attributes, & properties from the JSON
				var itemJSON = response.rows[0];

				var attributes = {};
				var attributeTypes = {};
				var attributeFormats = {};
				var attributeDisplayValues = {};
				var attributeReadOnly = {};
				var attributeItems = {};
				for ( var i in itemJSON.attributes) {
					var jsonAttribute = itemJSON.attributes[i];
					attributes[i] = jsonAttribute[0];
					if (jsonAttribute.length > 1) {
						attributeTypes[i] = jsonAttribute[1];
					}
					if (jsonAttribute.length > 2 && jsonAttribute[2] != null) {
						attributeFormats[i] = jsonAttribute[2];
					}
					if (jsonAttribute.length > 3 && jsonAttribute[3] != null) {
						attributeDisplayValues[i] = jsonAttribute[3];
					}
					attributeReadOnly[i] = (jsonAttribute.length > 4 && jsonAttribute[4] === true);
					if (jsonAttribute.length > 5 && jsonAttribute[5] != null && jsonAttribute[5].rows) {
						attributeItems[i] = ecm.model.ContentItem.createFromJSON(jsonAttribute[5].rows[0], this.repository, null);
					}
				}

				var item = {
					attributes: attributes,
					attributeTypes: attributeTypes,
					attributeFormats: attributeFormats
				};
				this._restoreSocialProperties(item);
				this._restoreKeepAttributes(item);

				// Update the item with the latest data
				this.originalId = this.id;
				delete this.accessMaskNotRetrieved;
				lang.mixin(this, itemJSON);
				this.attributes = attributes;
				this.attributeTypes = attributeTypes;
				this.attributeFormats = attributeFormats;
				this.attributeDisplayValues = attributeDisplayValues;
				this.attributeReadOnly = attributeReadOnly;
				this.attributeItems = attributeItems;

				// Rebuild Box share records.
				if (itemJSON.boxShareRecords instanceof Array) {
					this.boxShareRecords = dojo_array.map(itemJSON.boxShareRecords, lang.hitch(this, function(datum) {
						return BoxCollaborationRecord.createFromJSON(datum, BoxCollaborationRecord.prototype.COLLABORATION_TYPE.SHARE, this, null);
					}));
				}

				// Add to recent list
				this.repository.addRecentItem(this);

				this.repository.onChange([
					this
				]);
				this.originalId = null; // reset the originalId to null

				// If the user reindexed or if there are child components or template metadata, we need to do a full retrieve
				// as the response from editAttributes doesn't contain updated child components or template metadata.
				if (isReindex || (this._childComponents && this._childComponents.length > 0) || templatesUpdated) {
					this._childComponents = [];
					this.templateMetadata = [];
					this.retrieveAttributes(lang.hitch(this, function() {
						if (callback) {
							callback(response);
						}
					}));
				} else {
					if (callback) {
						callback(response);
					}
				}
			} else {
				if (callback) {
					callback(response);
				}
			}
			this.logExit("_saveAttributesCompleted");
		},

		/**
		 * @private
		 */
		_makeCheckinParams: function(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, addFormParams, parameters, templateMetadata) {

			var formParams = {
				criterias: JSON.stringify(criterias),
				childComponentValues: JSON.stringify(childComponentValues),
				acl: JSON.stringify(permissions),
				templateMetadata: JSON.stringify(templateMetadata)
			};
			if (content) {
				if (content.type == "Base64") {
					formParams.fileBase64 = content.content;
				} else {
					formParams.file = content;
				}
			}

			var params = {
				desktop: ecm.model.desktop.id,
				repositoryId: this.repository.id,
				parm_content_source_type: contentSourceType,
				docid: this.id,
				template_name: templateName,
				mimetype: mimeType,
				parm_part_filename: filename
			};

			if (addFormParams) {
				params.criterias = formParams.criterias;
				params.childComponentValues = formParams.childComponentValues;
				params.acl = formParams.acl;
				params.templateMetadata = formParams.templateMetadata
			}

			if (this.repository._isCM()) {
				params.parm_part_type = "ICMBASE";
				params.parm_create_new_version = newVersion ? "true" : "false";
			} else if (this.repository._isP8()) {
				params.securityPolicyId = securityPolicyId;
				params.asMinorVersion = checkInAsMinorVersion ? "true" : "false";
				params.autoClassify = autoClassify ? "true" : "false";
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			} else if (this.repository._isCmis()) {
				params.asMinorVersion = checkInAsMinorVersion ? "true" : "false";
			}

			if (parameters)
				lang.mixin(params, parameters);

			return params;
		},

		/**
		 * Checks in this item to the repository using the content stream.
		 * 
		 * @param templateName
		 *            The item's content class name. For example, the document's content class name, not an entry
		 *            template name.
		 * @param criteria
		 *            An array that contains item property objects. The value of each property object is assigned or
		 *            changed when the item is checked in. Include the following attributes for each property object in
		 *            your array:
		 *            <ul>
		 *            <li>name: The "id" of the property, from the property's AttributeDefinition object</li>
		 *            <li>datatype: The "dataType" of the property, from the property's AttributeDefinition object</li>
		 *            <li>label: The "name" of the property, from the property's AttributeDefinition object</li>
		 *            <li>value: The value to assign to the property, from the caller of the method. This value is
		 *            stored in the repository when the item is checked in.</li>
		 *            <li>displayValue: The "display value" of the property. Typically, the same as "value".</li>
		 *            </ul>
		 *            <br>
		 *            Exceptions for updating the item property values in the repository when the item is checked in:
		 *            <ul>
		 *            <li>When an item property is not included in the array, the current value for that item property
		 *            is retained in the repository.
		 *            <li>When the value property is specified for an item property object, but the current value in
		 *            the repository is the same, the current value for that item property is retained in the
		 *            repository.
		 *            </ul>
		 * @param contentSourceType
		 *            A string value that identifies the content source type.
		 *            <ul>
		 *            <li>"Folder"</li>
		 *            <li>"Document"</li>
		 *            <li>"Item" (no content)</li>
		 *            <li>"ExternalURL" (FileNet P8 only)</li>
		 *            </ul>
		 * @param mimeType
		 *            A string value that identifies the MIME type of the content. If you provide an empty string (""),
		 *            the repository determines the MIME type from the file extension.
		 * @param filename
		 *            A string value that contains one of the following values:
		 *            <ul>
		 *            <li>For a "Document" check in: the file name of the document.</li>
		 *            <li>For an "ExternalURL" check in: the location of the file associated with this item.</li>
		 *            </ul>
		 * @param content
		 *            The file content stream. A W3C File Object, see http://www.w3.org/TR/FileAPI/#dfn-file.
		 * @param childComponentValues
		 *            An array of child component values. (Content Manager only.) For other repository types, provide an
		 *            empty array ([])
		 * @param permissions
		 *            The permissions to be saved. To keep the current permissions for the item, provide a null value.
		 *            To change the permissions for the item, provide an array of permission objects. For more
		 *            information about permission objects, see ecm.model.Permission.
		 * @param securityPolicyId
		 *            A string value that contains a security policy id. (FileNet P8 only.) This value can be null. A
		 *            security policy defines the rules for automatically changing the permissions when a new version is
		 *            created, such as a release version, minor version, or deprecated version.
		 * @param newVersion
		 *            A boolean value indicating whether to create a new version.(Content Manager only.) For other
		 *            repository types, pass a null value.
		 * @param checkInAsMinorVersion
		 *            A boolean value indicating whether the item should be checked in as a minor version. (FileNet P8
		 *            only.) If the value is TRUE, a new minor version of the item is created. If the value is FALSE, a
		 *            new major version of the item is created.
		 * @param autoClassify
		 *            A boolean value indicating whether the item should be auto-classified. (FileNet P8 only) Set
		 *            autoClassify to TRUE to set class and properties automatically when you add a document. The
		 *            autoClassify value might not matter for checkIn of an existing document.
		 * @param callback
		 *            A callback function to be called after the item has been checked in. If the check in succeeds, the
		 *            callback function is called with the updated item: callback(ecm.model.ContentItem). If invalid
		 *            property values prevented the check in, the callback function is called with "undefined" for the
		 *            updated item and the field errors for the invalid property values: callback(undefined,
		 *            response.fieldErrors, response.templateMetadataErrors).
		 * @param isBackgroundRequest
		 *            A boolean flag indicating that this add request should be placed in a background process.
		 * @param uploadProgress
		 *            A boolean value indicating whether the event listener is added for upload progress event.
		 * @param onError
		 * @since 2.0.3.5 A callback function called if there is an error returned from the request.
		 * @param parameters
		 * @since 2.0.3.6 An object holding additional parameters to be passed in the request.
		 * @param templateMetadata
		 * @since 3.0 An array holding template metadata values.
		 */
		checkIn: function(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, isBackgroundRequest, uploadProgress, onError, parameters, templateMetadata) {
			this.logEntry("checkIn");
			var formParams = {
				criterias: JSON.stringify(criterias),
				childComponentValues: JSON.stringify(childComponentValues),
				acl: JSON.stringify(permissions),
			};
			if (templateMetadata){
				formParams.templateMetadata = JSON.stringify(templateMetadata);
			}
			if (content) {
				if (content.type == "Base64") {
					formParams.fileBase64 = content.content;
				} else {
					formParams.file = content;
				}
			}
			var params = this._makeCheckinParams(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, false, parameters, templateMetadata);
			
			if (this.repository._isCM() && this.resultSet && this.resultSet.showChildComponentAttribute) {
				params.showChildComponentAttribute = "true";
			}
			var request =null;
			if (contentSourceType == "Document" && ecm.model.desktop.uploadViaAspera && ecm.model.desktop.AsperaConnectInstalled && this.repository._isP8() && params.asperaContent){
				request = ecm.model.Request.postFormToServiceAPI("asperaCheckin", this.repository.type, {
					requestParams: params,
					requestCompleteCallback: callback,
					backgroundRequest: isBackgroundRequest,
					uploadProgress: uploadProgress,
					requestFailedCallback: onError
				}, formParams);
			}
			else
				request = ecm.model.Request.postFormToServiceAPI("checkIn", this.repository.type, {
					requestParams: params,
					requestCompleteCallback: lang.hitch(this, function(response) {
						this._checkInCompleted(response, callback);
					}),
					backgroundRequest: isBackgroundRequest,
					uploadProgress: uploadProgress,
					requestFailedCallback: onError
				}, formParams);

			this.logExit("checkIn");
			return request;
		},
		
		/**
		 * Checks in large document to the repository using the content stream.
		 * 
		 * @param templateName
		 *            The item's content class name. For example, the document's content class name, not an entry
		 *            template name.
		 * @param criteria
		 *            An array that contains item property objects. The value of each property object is assigned or
		 *            changed when the item is checked in. Include the following attributes for each property object in
		 *            your array:
		 *            <ul>
		 *            <li>name: The "id" of the property, from the property's AttributeDefinition object</li>
		 *            <li>datatype: The "dataType" of the property, from the property's AttributeDefinition object</li>
		 *            <li>label: The "name" of the property, from the property's AttributeDefinition object</li>
		 *            <li>value: The value to assign to the property, from the caller of the method. This value is
		 *            stored in the repository when the item is checked in.</li>
		 *            <li>displayValue: The "display value" of the property. Typically, the same as "value".</li>
		 *            </ul>
		 *            <br>
		 *            Exceptions for updating the item property values in the repository when the item is checked in:
		 *            <ul>
		 *            <li>When an item property is not included in the array, the current value for that item property
		 *            is retained in the repository.
		 *            <li>When the value property is specified for an item property object, but the current value in
		 *            the repository is the same, the current value for that item property is retained in the
		 *            repository.
		 *            </ul>
		 * @param contentSourceType
		 *            A string value that identifies the content source type.
		 *            <ul>
		 *            <li>"Folder"</li>
		 *            <li>"Document"</li>
		 *            <li>"Item" (no content)</li>
		 *            <li>"ExternalURL" (FileNet P8 only)</li>
		 *            </ul>
		 * @param mimeType
		 *            A string value that identifies the MIME type of the content. If you provide an empty string (""),
		 *            the repository determines the MIME type from the file extension.
		 * @param filename
		 *            A string value that contains one of the following values:
		 *            <ul>
		 *            <li>For a "Document" check in: the file name of the document.</li>
		 *            <li>For an "ExternalURL" check in: the location of the file associated with this item.</li>
		 *            </ul>
		 * @param content
		 *            The file content stream. A W3C File Object, see http://www.w3.org/TR/FileAPI/#dfn-file.
		 * @param childComponentValues
		 *            An array of child component values. (Content Manager only.) For other repository types, provide an
		 *            empty array ([])
		 * @param permissions
		 *            The permissions to be saved. To keep the current permissions for the item, provide a null value.
		 *            To change the permissions for the item, provide an array of permission objects. For more
		 *            information about permission objects, see ecm.model.Permission.
		 * @param securityPolicyId
		 *            A string value that contains a security policy id. (FileNet P8 only.) This value can be null. A
		 *            security policy defines the rules for automatically changing the permissions when a new version is
		 *            created, such as a release version, minor version, or deprecated version.
		 * @param newVersion
		 *            A boolean value indicating whether to create a new version.(Content Manager only.) For other
		 *            repository types, pass a null value.
		 * @param checkInAsMinorVersion
		 *            A boolean value indicating whether the item should be checked in as a minor version. (FileNet P8
		 *            only.) If the value is TRUE, a new minor version of the item is created. If the value is FALSE, a
		 *            new major version of the item is created.
		 * @param autoClassify
		 *            A boolean value indicating whether the item should be auto-classified. (FileNet P8 only) Set
		 *            autoClassify to TRUE to set class and properties automatically when you add a document. The
		 *            autoClassify value might not matter for checkIn of an existing document.
		 * @param callback
		 *            A callback function to be called after the item has been checked in. If the check in succeeds, the
		 *            callback function is called with the updated item: callback(ecm.model.ContentItem). If invalid
		 *            property values prevented the check in, the callback function is called with "undefined" for the
		 *            updated item and the field errors for the invalid property values: callback(undefined,
		 *            response.fieldErrors, response.templateMetadataErrors).
		 * @param isBackgroundRequest
		 *            A boolean flag indicating that this add request should be placed in a background process.
		 * @param uploadProgress
		 *            A boolean value indicating whether the event listener is added for upload progress event.
		 * @param onError
		 *            A callback function called if there is an error returned from the request.
		 * @param parameters
		 *            An object holding additional parameters to be passed in the request.
		 * @param templateMetadata
		 * @since 3.0 An array holding tempate metadata values.
		 */
		checkInLargeDocument: function(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, isBackgroundRequest, uploadProgress, onError, parameters, templateMetadata) {
			this.logEntry("checkInLargeDocument");
			var formParams = {
				criterias: JSON.stringify(criterias),
				childComponentValues: JSON.stringify(childComponentValues),
				acl: JSON.stringify(permissions),
				templateMetadata: JSON.stringify(templateMetadata)
			};

			var params = this._makeCheckinParams(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, false, parameters, templateMetadata);
			
			var blob = content;
			var BYTES_PER_CHUNK = 104857600;//chunk size is 100M.
			if (has("mac") && has("safari")) 
				BYTES_PER_CHUNK = 20971520; //chunk size is 20M for safari.
            var SIZE = blob.size;
            var start = 0;
            var end = BYTES_PER_CHUNK;
            var sequence = 0;
            var requestId = generateRandomUuid();
            
            var hasEqualSizeChunk = false;
           
            while( start < SIZE ) {

            	if (end >= SIZE && !hasEqualSizeChunk) {
                	//it is the last chunk
                	var lastChunkSize = SIZE - start;
                	for (var i = 0; i < sequence; i++) {
                		if (BYTES_PER_CHUNK + i == lastChunkSize) {
                			hasEqualSizeChunk = true;
                			break;
                		}
                	}
                	
                }
                
                if (hasEqualSizeChunk) {
                	end = start + BYTES_PER_CHUNK / 2 + sequence;
                }
                
                var chunk = blob.slice(start, end);
                
                formParams.file = chunk;
                formParams.requestFileId = requestId;
                formParams.fileSize = SIZE;
                formParams.sequence = sequence;
                formParams.partFileName = filename;
                
                var request = ecm.model.Request.postFormToServiceAPI("checkInLargeDocument", this.repository.type, {
        			requestParams: params,
        			requestCompleteCallback: lang.hitch(this, function(response) {
        				if (response.messages && response.messages.length == 1) {
            				this.logDebug("CheckInLargeDocumentCompleted");
            				this._checkInCompleted(response, callback);
        				} else {
        					this.logDebug("AddOneChunkCompleted");
        				}
        			}),
        			backgroundRequest: isBackgroundRequest,
        			requestFailedCallback: onError,
        			uploadProgress: uploadProgress
        		}, formParams);
                sequence ++;
                start = end;
                end = start + BYTES_PER_CHUNK + sequence;
            };

			this.logExit("checkInLargeDocument");
			return request;
		},

		/**
		 * Checks in this item to the repository using the content stream.
		 * 
		 * @param redactionContent
		 *            A JSON object from Daeja redaction process with info to retrieve redacted content on server side
		 * @param mimeType
		 *            MIME type of the redacted content
		 * @param callback
		 *            A callback function to be called after the item has been checked in. If the check in succeeds, the
		 *            callback function is called with the updated item: callback(ecm.model.ContentItem). If invalid
		 *            property values prevented the check in, the callback function is called with "undefined" for the
		 *            updated item and the field errors for the invalid property values: callback(undefined,
		 *            response.fieldErrors, response.templateMetadataErrors).
		 * @param documentTitle
		 *            An optional string value to update document title property during check in
		 *            
		 * @deprecated Deprecated in ICN 3.0.1. Use checkInDaejaContent() instead.
		 */
		checkInRedaction: function(redactionContent, callback, onError, fileName, mimeType, documentTitle) {
			this.logEntry("checkInRedaction");

			var request = this.checkInDaejaContent(redactionContent, callback, onError, fileName, mimeType, documentTitle); 
			
			this.logExit("checkInRedaction");
			return request;
		},
		
		/**
		 * Checks in this item to the repository using the content provided by the Daeja viewer.
		 * 
		 * @param daejaContent
		 *            A JSON object provided by the Daeja viewer for retrieving the content from the Daeja viewer on the server.
		 * @param mimeType
		 *            The MIME type of the content.
		 * @param callback
		 *            A callback function called after the item has been checked in. If the check in succeeds, the
		 *            callback function is called with the updated item: callback(ecm.model.ContentItem). If invalid
		 *            property values prevented the check in, the callback function is called with "undefined" for the
		 *            updated item and the field errors for the invalid property values: callback(undefined,
		 *            response.fieldErrors, response.templateMetadataErrors).
		 * @param documentTitle
		 *            An optional string value to update the document title property during the check in.
		 */
		checkInDaejaContent: function(daejaContent, callback, onError, fileName, mimeType, documentTitle) {
			this.logEntry("checkInDaejaContent");

			var templateName = this.template;
			var criterias = [];
			var contentSourceType = "Document";
			var content = null; // Content URL is in daejaContent below.
			var childComponentValues = [];
			var permissions = null; // No change to permissions.
			var securityPolicyId = null; // No change to the security policy.
			var newVersion = true;
			var checkInAsMinorVersion = (this.repository._isP8()) ? false : true;
			var autoClassify = false;
			var isBackgroundRequest = false;
			var uploadProgress = false;
			var parameters = {
					daejaContent: JSON.stringify(daejaContent)
			};

			if (documentTitle) {
				var contentClass = this.getContentClass();
				var docTitlePropertyName = this._getTitlePropertyName(contentClass);
				var attrDef = contentClass.attributeDefinitionsById && contentClass.attributeDefinitionsById[docTitlePropertyName];

				if (attrDef != null) {
					criterias.push({
						"name": docTitlePropertyName,
						"value": documentTitle,
						"dataType": this.attributeTypes[docTitlePropertyName],
						"label": attrDef.name,
					});
				}
			}

			var request = this.checkIn(templateName, criterias, contentSourceType, mimeType, fileName, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, isBackgroundRequest, uploadProgress, onError, parameters);

			this.logExit("checkInDaejaContent");
			return request;
		},

		/**
		 * Checks in an item using CORS if available, falls back to this.checkin if an error occurs.
		 * NOTE: Parameters for this function must be kept in sync with this.checkin().
		 * 
		 * @since 3.0.1
		 * @param templateName
		 *            The item's content class name. For example, the document's content class name, not an entry
		 *            template name.
		 * @param criteria
		 *            An array that contains item property objects. The value of each property object is assigned or
		 *            changed when the item is checked in. Include the following attributes for each property object in
		 *            your array:
		 *            <ul>
		 *            <li>name: The "id" of the property, from the property's AttributeDefinition object</li>
		 *            <li>datatype: The "dataType" of the property, from the property's AttributeDefinition object</li>
		 *            <li>label: The "name" of the property, from the property's AttributeDefinition object</li>
		 *            <li>value: The value to assign to the property, from the caller of the method. This value is
		 *            stored in the repository when the item is checked in.</li>
		 *            <li>displayValue: The "display value" of the property. Typically, the same as "value".</li>
		 *            </ul>
		 *            <br>
		 *            Exceptions for updating the item property values in the repository when the item is checked in:
		 *            <ul>
		 *            <li>When an item property is not included in the array, the current value for that item property
		 *            is retained in the repository.
		 *            <li>When the value property is specified for an item property object, but the current value in
		 *            the repository is the same, the current value for that item property is retained in the
		 *            repository.
		 *            </ul>
		 * @param contentSourceType
		 *            A string value that identifies the content source type.
		 *            <ul>
		 *            <li>"Folder"</li>
		 *            <li>"Document"</li>
		 *            <li>"Item" (no content)</li>
		 *            <li>"ExternalURL" (FileNet P8 only)</li>
		 *            </ul>
		 * @param mimeType
		 *            A string value that identifies the MIME type of the content. If you provide an empty string (""),
		 *            the repository determines the MIME type from the file extension.
		 * @param filename
		 *            A string value that contains one of the following values:
		 *            <ul>
		 *            <li>For a "Document" check in: the file name of the document.</li>
		 *            <li>For an "ExternalURL" check in: the location of the file associated with this item.</li>
		 *            </ul>
		 * @param content
		 *            The file content stream. A W3C File Object, see http://www.w3.org/TR/FileAPI/#dfn-file.
		 * @param childComponentValues
		 *            An array of child component values. (Content Manager only.) For other repository types, provide an
		 *            empty array ([])
		 * @param permissions
		 *            The permissions to be saved. To keep the current permissions for the item, provide a null value.
		 *            To change the permissions for the item, provide an array of permission objects. For more
		 *            information about permission objects, see ecm.model.Permission.
		 * @param securityPolicyId
		 *            A string value that contains a security policy id. (FileNet P8 only.) This value can be null. A
		 *            security policy defines the rules for automatically changing the permissions when a new version is
		 *            created, such as a release version, minor version, or deprecated version.
		 * @param newVersion
		 *            A boolean value indicating whether to create a new version.(Content Manager only.) For other
		 *            repository types, pass a null value.
		 * @param checkInAsMinorVersion
		 *            A boolean value indicating whether the item should be checked in as a minor version. (FileNet P8
		 *            only.) If the value is TRUE, a new minor version of the item is created. If the value is FALSE, a
		 *            new major version of the item is created.
		 * @param autoClassify
		 *            A boolean value indicating whether the item should be auto-classified. (FileNet P8 only) Set
		 *            autoClassify to TRUE to set class and properties automatically when you add a document. The
		 *            autoClassify value might not matter for checkIn of an existing document.
		 * @param callback
		 *            A callback function to be called after the item has been checked in. If the check in succeeds, the
		 *            callback function is called with the updated item: callback(ecm.model.ContentItem). If invalid
		 *            property values prevented the check in, the callback function is called with "undefined" for the
		 *            updated item and the field errors for the invalid property values: callback(undefined,
		 *            response.fieldErrors, response.templateMetadataErrors).
		 * @param isBackgroundRequest
		 *            A boolean flag indicating that this add request should be placed in a background process.
		 * @param uploadProgress
		 *            A boolean value indicating whether the event listener is added for upload progress event.
		 * @param onError
		 *            A callback function called if there is an error returned from the request.
		 * @param parameters
		 *            An object holding additional parameters to be passed in the request.
		 * @param templateMetadata
		 * 			  An array holding template metadata values.
		 */
		checkInUsingCORS: function(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, isBackgroundRequest, uploadProgress, onError, parameters, templateMetadata){
			this.logEntry("checkInUsingCORS");
			
			var idParts = this.id.split(",")
			var boxId = idParts[1];
			
			var xhr = this._getCORSRequest(boxId);
			if (!xhr || !this.repository.corsUploadEnabled || !content){				
				// if CORS isn't supported by the browser, fall back to the non-CORS method of adding the document.
				this.logDebug("CORS not supported by browser. Falling back to this.checkin()...");
				this.checkIn(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, isBackgroundRequest, uploadProgress, onError, parameters, templateMetadata);
			}
			else{
				// Get the content of the file.
				var reader = new FileReader();
				reader.onerror = (lang.hitch(this, function(){
					// If an error occurs reading the file, fall back to standard checkin
					this.logDebug("Error reading document content. Falling back to this.checkin()...");
					this.checkIn(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, isBackgroundRequest, uploadProgress, onError, parameters, templateMetadata);				
				}));
			
				var _templateMetadataValues = templateMetadata;
				reader.onload = (lang.hitch(this, function(event) {
					this.logDebug("Loaded document content.");
					var form = new FormData();
					
					var blob = new Blob([event.target.result], { type: mimeType});
					form.append('file', blob, filename);
					var handleSuccess = lang.hitch(this, function(response){
						this.logDebug("Success uploading content.");
						var newVersion = ContentItem.createFromJSON(responseJson.entries[0], this.repository);
						newVersion.template = "file";
						this.repository.addRecentItem(newVersion);
						
						// The id may have changed. Remember the original id.
						newVersion.id  = "file," + newVersion.id;
						newVersion.originalId = this.id
						this.update(newVersion, true);

						params = {};
						if (_templateMetadataValues != null && _templateMetadataValues.length > 0){
							this.logDebug("Found metadata.");
							params["templateMetadata"] = _templateMetadataValues;
						}
						newVersion.saveAttributes(criterias, "", [], [], true, lang.hitch(this, function(){
							this.logDebug("Returned from saveAttributes.");
							callback(newVersion);
						}), false, function(response){
							// Error message stating the document was checked in, but there was a problem saving properties and metadata template values.
							this.logDebug("Error saving attributes.");
							ecm.model.desktop.addMessage(Message.createErrorMessage("checkin_cors_save_attributes_error"));
						}, params);
					});
					
					var _handleSuccess = handleSuccess;
					var handleError = lang.hitch(this, function() {
						this.logDebug("Error uploading content. Getting fresh access token...");
						// The upload may have failed because the access token expired. Get a fresh access token from the mid tier
						// and retry.
						request = ecm.model.Request.invokeService("getOAuthToken", this.repository.type,{
							repositoryId: this.repository.id
						}, lang.hitch(this, function(response) {
							this.logDebug("Retrieved access token.");
							this.repository.accessToken = response.accessToken;
							
							var handleError2 = lang.hitch(this, function(){
								// If an error occurred this time, fall back.
								this.logDebug("Error uploading content on second try. Falling back to this.checkIn()");
								this.checkIn(templateName, criterias, contentSourceType, mimeType, filename, content, childComponentValues, permissions, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, isBackgroundRequest, uploadProgress, onError, parameters, templateMetadata);				
							});
							
							var xhrOnload2 = lang.hitch(this, function() {
								responseJson = JSON.parse(xhr.responseText);
								if (responseJson.type && responseJson.type == "error"){
									handleError2();								}
								else if (responseJson.entries && responseJson.entries[0].id){
									_handleSuccess(responseJson);
								}
							});

							var xhr = this._getCORSRequest(boxId);
							if (!xhr){
								// If there was a problem building the request, fall back.
								handleError2();
							};
							this._sendCORSUpload(this.repository.accessToken, xhr, form, xhrOnload2, handleError2);
						}));
					});
					
					var xhrOnload = lang.hitch(this, function() {
						responseJson = JSON.parse(xhr.responseText);
						if (responseJson.type && responseJson.type == "error"){
							handleError();
						}
						else if (responseJson.entries && responseJson.entries[0].id){
							handleSuccess(responseJson);
						}
					});
					
					this._sendCORSUpload(this.repository.accessToken, xhr, form, xhrOnload, handleError)
				}));
				
				// Read the contents.
				reader.readAsArrayBuffer(content);
			}

			this.logExit("checkInUsingCORS");
		},

		_getTitlePropertyName: function(contentClass) {
			var titlePropertyName;
			var repository = this.repository;
			if (repository._isP8()) {
				titlePropertyName = "DocumentTitle";
			} else if (repository._isCmis()) {
				titlePropertyName = "cmis:name";
			} else if (repository._isCM()) {
				if (contentClass) {
					titlePropertyName = contentClass.nameAttribute;
				}
			} else if (repository._isBox()) {
				titlePropertyName = "name";
			}
			return titlePropertyName;
		},

		/**
		 * Checks in this item to the repository using a form object to submit the content and other settings. Use this
		 * method when checking in content under a browser that does not support HTML5, such as Internet Explorer
		 * version 9 or earlier.
		 * 
		 * @param templateName
		 *            The item's content class name. For example, the document's content class name, not an entry
		 *            template name.
		 * @param contentSourceType
		 *            A string value that indicates the content source type.
		 *            <ul>
		 *            <li>"Folder"</li>
		 *            <li>"Document"</li>
		 *            <li>"Item" (no content)</li>
		 *            <li>"ExternalURL" (FileNet P8 only)</li>
		 *            <ul>
		 * @param filename
		 *            A string value that contains one of the following values:
		 *            <ul>
		 *            <li>For a "Document" check in: the file name of the document.</li>
		 *            <li>For an "ExternalURL" check in: the location of the file associated with this item.</li>
		 *            </ul>
		 * @param form
		 *            A form object named "fileUploadForm" that contains the input file, criterias,
		 *            childComponentValues, acl, and an IFRAME. For an example of the content of the form object, see
		 *            "fileUploadForm" in ecm/widget/templates/AddContentItemGeneralPane.html. Include the following
		 *            attributes for the "fileUploadForm":
		 *            <ul>
		 *            <li>For more information about the criterias attribute, see the checkIn method, criteria
		 *            attribute.
		 *            <li>For more information about the childComponentValues attribute, see the checkIn method,
		 *            childComponentValues attribute.
		 *            <li>For more information about the acl attribute, see the checkIn method, permissions attribute.
		 *            <li>
		 * @param securityPolicyId
		 *            A string value that contains a security policy id. (FileNet P8 only.) This value can be null. A
		 *            security policy defines the rules for automatically changing the permissions when a new version is
		 *            created, such as a release version, minor version, or deprecated version.
		 * @param newVersion
		 *            A boolean value indicating whether to create a new version.(Content Manager only.) For other
		 *            repository types, pass a null value.
		 * @param checkInAsMinorVersion
		 *            A boolean value indicating whether the item should be checked in as a minor version. (FileNet P8
		 *            only.) If the value is TRUE, a new minor version of the item is created. If the value is FALSE, a
		 *            new major version of the item is created.
		 * @param autoClassify
		 *            A boolean value indicating whether the item should be auto-classified. (FileNet P8 only) Set
		 *            autoClassify to TRUE to set class and properties automatically when you add a document. The
		 *            autoClassify value might not matter for checkIn of an existing document.
		 * @param callback
		 *            A callback function to be called after the item has been checked in. If the check in succeeds, the
		 *            callback function is called with the updated item: callback(ecm.model.ContentItem). If invalid
		 *            property values prevented the check in, the callback function is called with "undefined" for the
		 *            updated item and the field errors for the invalid property values: callback(undefined,
		 *            response.fieldErrors, response.templateMetadataErrors).
		 * @param onError
		 * @since 2.0.3.5 A callback function called if there is an error returned from the request.
		 */
		checkInUsingForm: function(templateName, contentSourceType, filename, form, securityPolicyId, newVersion, checkInAsMinorVersion, autoClassify, callback, onError) {
			this.logEntry("checkInUsingForm");

			var params = {
				desktop: ecm.model.desktop.id,
				repositoryId: this.repository.id,
				parm_content_source_type: contentSourceType,
				docid: this.id,
				template_name: templateName,
				parm_part_filename: filename
			};

			if (this.repository._isCM()) {
				params.parm_create_new_version = newVersion ? "true" : "false";
			} else if (this.repository._isP8()) {
				params.securityPolicyId = securityPolicyId;
				params.asMinorVersion = checkInAsMinorVersion ? "true" : "false";
				params.autoClassify = autoClassify ? "true" : "false";
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			} else if (this.repository._isCmis()) {
				params.asMinorVersion = checkInAsMinorVersion ? "true" : "false";
			}

			var request = ecm.model.Request.ieFileUploadServiceAPI("checkIn", this.repository.type, {
				requestParams: params,
				requestCompleteCallback: lang.hitch(this, function(response) {
					this._checkInCompleted(response, callback);
				}),
				requestFailedCallback: onError
			}, form);

			this.logExit("checkInUsingForm");
			return request;
		},

		_checkInCompleted: function(response, callback) {
			this.logEntry("_checkInCompleted");
			if (response.fieldErrors || response.templateMetadataErrors) {
				if (callback) {
					callback(undefined, response.fieldErrors, response.templateMetadataErrors);
				}
			} else {
				var itemJSON = response.rows[0];
				var item = ecm.model.ContentItem.createFromJSON(itemJSON, this.repository);

				// The id may have changed. Remember the original id.
				var originalId = this.id;
				this.update(item, true);

				var clonedItem = this.clone();
				clonedItem.id = item.id;
				clonedItem.originalId = originalId;
				this.onChange([
					clonedItem
				]);
				if (callback) {
					callback(item);
				}
				this.repository.addRecentItem(item);

				// (CMIS-only) refresh parent folder to work around Alfresco showing both working copy and checked-in version.
				if (this.repository._isCmis()) {
					// Note:  Client UI does not allow multi-select on check In so no perf issue of refreshing folder multiple times.
					if (this.parent != null) {
						// a doc has a parent in browse view but not in query view.
						this.parent.refresh();
					}
				}
			}
			this.logExit("_checkInCompleted");
		},

		clone: function() {
			// First create a minimal attribute definition.
			var thisClone = new ecm.model.ContentItem({
				id: this.id,
				name: this.name
			});
			lang.mixin(thisClone, this);

			thisClone.attributes = lang.clone(this.attributes);
			thisClone.attributeLabels = lang.clone(this.attributeLabels);
			thisClone.attributeTypes = lang.clone(this.attributeTypes);
			thisClone.attributeFormats = lang.clone(this.attributeFormats);
			thisClone.attributeDisplayValues = lang.clone(this.attributeDisplayValues);
			thisClone.attributeReadOnly = lang.clone(this.attributeReadOnly);
			if (this.attributeItems) {
				thisClone.attributeItems = new Object();
				lang.mixin(thisClone.attributeItems, this.attributeItems);
			}
			return thisClone;
		},

		/**
		 * Updates this item from the contents of the passed-in item. The update is allowed only if it is for the same
		 * document. The context of this item (result set, parent, and repository) is preserved.
		 * 
		 * @param item
		 *            An {@link ecm.model.ContentItem} object to update.
		 * @param skipOnChange
		 *            A boolean value indicating whether the <code>onChange</code> event should be called as part of
		 *            this update process.
		 * @param skipOnChangeMessage
		 *            A boolean value indicating whether a message should be published when the <code>onChange</code> is called.
		 */
		update: function(item, skipOnChange, skipOnChangeMessage) {
			if (!this.repository || !item.repository || (this.repository.id != item.repository.id)) {
				return;
			}
			// Sanity check - this should be the same document.
			if (this.repository._isP8()) {
				// New versions of the same document Id will have a different Id so check the version series Id instead.
				if (!this || !item || (this.vsId != item.vsId)) {
					return;
				}
			}
			// CM PID will have a different version number within the PID string after checking in a new version.
			// The ItemID portion of the PID is not currently returned, so don't check for CM - trust that the
			// passed in item is an update to this item.

			this._restoreSocialProperties(item);
			this._restoreKeepAttributes(item);

			// If the update item includes an access mask and accessMaskNotRetrieved is not set, clear accessMaskNotRetrieved. 
			if (item.accessMask && !item.accessMaskNotRetrieved) {
				delete this.accessMaskNotRetrieved;
			}

			for ( var prop in item) {
				if ((typeof item[prop] !== "function") && (prop != "declaredClass") && (prop != "resultSet") && (prop != "parent") && (prop != "repository") && (prop != "_sharedRequests")) {
					this[prop] = item[prop];
				}
			}

			// Save the original id if needed.
			if (this.originalId == null && item.origdocid != null) {
				this.originalId = item.origdocid;
			}

			if (this._deletedSharedVersion) {
				this._deleteShareRecord(true);
				this._deletedSharedVersion = null;
			}

			if (!skipOnChange) {
				this.onChange([
					this
				], skipOnChangeMessage);
			}
		},

		/**
		 * Returns the social count of the given type if availble. Returns -1 if the count is not available. Counts can
		 * be retrieved by using the {@link ecm.model.ContentItem.retrieveAttributes} method.
		 * 
		 * @param type
		 *            The type of the social collaboration as defined in {@link ecm.model.SocialItem.TYPE}.
		 * @since 2.0.3
		 */
		getSocialCount: function(type) {
			if (!this.isAvailableForSocialCollaboration(type, true))
				return -1;

			var countName = this._getCountPropertyName(type);
			if (!countName || !this.hasAttribute(countName))
				return -1;

			var count = this.getValue(countName);
			return count ? count : 0;
		},

		/**
		 * Returns the name of the tags property for this item.
		 * 
		 * @since 2.0.3.5
		 */
		getTagsPropertyName: function() {
			return this.repository._isBox() ? "tags" : "ClbTags";
		},

		_getCountPropertyName: function(type) {
			var name;
			if (this.repository && this.repository._isBox()) {
				if (type == SocialItem.prototype.TYPE.COMMENT)
					name = "comment_count";
			} else {
				if (type == SocialItem.prototype.TYPE.COMMENT)
					name = "ClbCommentCount";
				else if (type == SocialItem.prototype.TYPE.RECOMMENDATION)
					name = "ClbRecommendationCount";
				else if (type == SocialItem.prototype.TYPE.DOWNLOAD)
					name = "ClbDownloadCount";
			}

			return name;
		},

		_restoreSocialProperties: function(item) {
			if (this.repository._isBox()) {
				this._restoreAttribute(item, "comment_count");
				this._restoreAttribute(item, "tags");
			} else {
				this._restoreAttribute(item, "ClbCommentCount");
				this._restoreAttribute(item, "ClbDownloadCount");
				this._restoreAttribute(item, "ClbRecommendationCount");
				this._restoreAttribute(item, "ClbTags");
			}
		},

		_restoreAttribute: function(item, attribName) {
			if (this.attributes[attribName] != null && item.attributes[attribName] == null) {
				item.attributes[attribName] = this.attributes[attribName];
				if (item.attributeTypes && item.attributeTypes[attribName] == null && this.attributeTypes && this.attributeTypes[attribName] != null)
					item.attributeTypes[attribName] = this.attributeTypes[attribName];
				if (item.attributeFormats && item.attributeFormats[attribName] == null && this.attributeFormats && this.attributeFormats[attribName] != null)
					item.attributeFormats[attribName] = this.attributeFormats[attribName];
				if (item.attributeSystemProperty && item.attributeSystemProperty[attribName] == null && this.attributeSystemProperty && this.attributeSystemProperty[attribName] != null)
					item.attributeSystemProperty[attribName] = this.attributeSystemProperty[attribName];
				if (item.attributeDisplayValues && item.attributeDisplayValues[attribName] == null && this.attributeDisplayValues && this.attributeDisplayValues[attribName] != null)
					item.attributeDisplayValues[attribName] = this.attributeDisplayValues[attribName];
				if (item.attributeReadOnly && item.attributeReadOnly[attribName] == null && this.attributeReadOnly && this.attributeReadOnly[attribName] != null)
					item.attributeReadOnly[attribName] = this.attributeReadOnly[attribName];
				if (item.attributeItems && item.attributeItems[attribName] == null && this.attributeItems && this.attributeItems[attribName] != null)
					item.attributeItems[attribName] = this.attributeItems[attribName];
				if (item.attributeUserInfo && item.attributeUserInfo[attribName] == null && this.attributeUserInfo && this.attributeUserInfo[attribName] != null)
					item.attributeUserInfo[attribName] = this.attributeUserInfo[attribName];
			}
		},

		_restoreKeepAttributes: function(item) {
			dojo_array.forEach(this.keepAttributeNames, lang.hitch(this, function(attribName) {
				this._restoreAttribute(item, attribName);
			}));
		},

		/**
		 * This event is called for any change to the content item. This includes events that retrieve additional
		 * attribute information or that update attribute information about the item. A message containing the item is
		 * published with the "ecm/model/ContentItem/onChange" topic.
		 * 
		 * @param item
		 *            An {@link ecm.model.ContentItem} object.
		 * @param skipMessage
		 *            A boolean value to skip publishing a message.
		 */
		onChange: function(item, skipMessage) {
			if (this.resultSet) {
				this.resultSet.onChange(item);

				// Do not call repository onChange for version list items.
				if ((this.mimetype != "folder" || (this.repository && !this.repository._isP8())) && this.resultSet.context == "PropertiesVersions") {
					return;
				}
			}
			this.repository.onChange(item);
			if (!skipMessage) {
				topic.publish("ecm/model/ContentItem/onChange", this);
			}
		},

		/**
		 * Returns true if the item has the specified privilege.
		 * 
		 * @param privilege
		 *            The identifier of the privilege to test.
		 */
		hasPrivilege: function(privilege) {
			return this.inherited(arguments);
		},
		
		/**
		 * Retrieved the collaborators on a folder. Box only
		 * @since 3.0
		 */
		retrieveBoxCollaborators: function(callback){
			var methodName = "retrieveBoxCollaborators";
			this.logEntry(methodName);

			// Retrieve collaborators from the server.
			var params = {
				repositoryId: this.repository.id,
				docid: this.id
			};
			
			var request = ecm.model.Request.invokeService("getCollaborators", this.repository.type, params, lang.hitch(this, function(response) {
				var jsonCollaborators = response.collaborators;
				var boxCollaborators = [];
				if (jsonCollaborators){
					for (var i = 0; i < jsonCollaborators.length; i++){
						var jsonCollaborator = jsonCollaborators[i];
						var bc = BoxCollaborator.fromJSON (jsonCollaborator);
						boxCollaborators.push(bc);
					}
				}
				if (callback){
					callback(boxCollaborators);
				}
			}));
			
			this.logExit(methodName);
			return request;
		},

		/**
		 * Retrieves the permissions for this content item.
		 * 
		 * @param callback
		 *            A callback function called after the permission have been retrieved. Passes an array of
		 *            {@link ecm.model.Permission} objects as a parameter.
		 */
		retrievePermissions: function(callback) {
			this.logEntry("retrievePermissions");

			// Retrieve permission from the server
			var params = {
				repositoryId: this.repository.id,
				docid: this.id
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}

			var request = ecm.model.Request.invokeService("getPermissions", this.repository.type, params, lang.hitch(this, function(response) {
				var permissions = ecm.model.Permission.createFromJSON(response.acl);

				// This block is included for backwards compatibility, but should be removed in a future release.
				if (response.modifyPermissions != undefined) {
					this.modifyPermissions = response.modifyPermissions === true || response.modifyPermissions === "true" || false;
					if (this.modifyPermissions) {
						this.privileges |= ecm.model.Item.PrivilegeToBitmask["privModifyPermissions"];
					} else { // Clear modify permissions bit
						this.privileges &= ~ecm.model.Item.PrivilegeToBitmask["privModifyPermissions"];
					}
				}

				if (callback) {
					callback(permissions);
				}
			}));

			this.logExit("retrievePermissions");
			return request;
		},

		/**
		 * Returns a list of folders (ContentItems) that the item is filed into.
		 * 
		 * @param callback
		 *            A callback function that is called after the folders have been retrieved. Passes an array of
		 *            {@link ecm.model.ContentItem} objects as a parameter.
		 */
		retrieveFoldersFiledIn: function(callback) {
			this.logEntry("retrieveFoldersFiledIn");

			var self = this;
			var params = {
				repositoryId: this.repository.id,
				docid: this.id,
				template_name: this.template
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}

			var request = ecm.model.Request.invokeService("getFoldersFiledIn", this.repository.type, params, lang.hitch(this, function(response) {
				response.repository = self.repository;
				var results = ContentItem.createResultSet(response);
				if (callback) {
					callback(results.getItems(), results.structure.cells[0], results);
				}
			}));

			this.logExit("retrieveFoldersFiledIn");
			return request;
		},

		/**
		 * Retrieves an {@link ecm.model.ResultSet} object containing all content elements for this item.
		 * 
		 * @param callback
		 *            A function that is called when the content element retrieval has completed.
		 */
		retrieveContentElements: function(callback) {
			this.logEntry("retrieveContentElements");

			var self = this;
			var params = {
				repositoryId: this.repository.id,
				docid: this.id,
				template_name: this.template
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}

			var request = ecm.model.Request.invokeService("getContentElements", this.repository.type, params, lang.hitch(this, function(response) {
				response.repository = self.repository;
				response.setType = "contentElement";
				response.contentElementParent = this;
				var results = ContentItem.createResultSet(response);
				if (callback) {
					callback(results);
				}
			}));

			this.logExit("retrieveContentElements");
			return request;
		},

		/**
		 * Promotes a minor version to a major version. (FileNet P8 only)
		 */
		promoteVersion: function() {
			this.logEntry("promoteVersion");

			var params = {
				repositoryId: this.repository.id,
				docid: this.id
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}

			var request = ecm.model.Request.invokeService("promoteVersion", this.repository.type, params, lang.hitch(this, lang.hitch(this, function(response) {
				this._promoteVersionCompleted(response);
			})));

			this.logExit("promoteVersion");
			return request;
		},

		_promoteVersionCompleted: function(response) {
			this.logEntry("_promoteVersionCompleted");
			if (!response.fieldErrors) {
				// Get the new major version and call update on it.
				var itemsJSON = response.rows;
				var promotedItem = ecm.model.ContentItem.createFromJSON(itemsJSON[0], this.repository, null);
				this.update(promotedItem);

				// Next, get the old released version to get its id. Call update again on the newly promoted version with the
				// originalId and _updateReleasedOnly values set so anywhere we are displaying the prior released version will be
				// replaced by the newly promoted version.
				if (itemsJSON.length > 1) {
					var oldReleasedVersion = ecm.model.ContentItem.createFromJSON(itemsJSON[1], this.repository, null);
					promotedItem._updateReleasedOnly = true;
					promotedItem.originalId = oldReleasedVersion.id;
					this.repository.onChange([
						promotedItem
					]);
					promotedItem._updateReleasedOnly = null;
				}
			}
			this.logExit("_promoteVersionCompleted");
		},

		/**
		 * Demotes a major version to a minor version. (FileNet P8 only)
		 */
		demoteVersion: function() {
			this.logEntry("demoteVersion");

			var params = {
				repositoryId: this.repository.id,
				docid: this.id
			};

			if (this.repository._isP8()) {
				params.objectStoreId = this.objectStore ? this.objectStore.id : "";
			}

			var request = ecm.model.Request.invokeService("demoteVersion", this.repository.type, params, lang.hitch(this, lang.hitch(this, function(response) {
				this._demoteVersionCompleted(response);
			})));

			this.logExit("demoteVersion");
			return request;
		},

		_demoteVersionCompleted: function(response) {
			this.logEntry("_demoteVersionCompleted");
			if (!response.fieldErrors) {
				// Get tne new minor version and call update on it.
				var itemsJSON = response.rows;
				var demotedItem = ecm.model.ContentItem.createFromJSON(itemsJSON[0], this.repository, null);
				this.update(demotedItem);

				// Next, get the new released version. Set the original ID and _updateReleasedOnly flag so it will replace
				// the demoted version where we are displaying only released versions.
				if (itemsJSON.length > 1) {
					var newReleasedVersion = ecm.model.ContentItem.createFromJSON(itemsJSON[1], this.repository, null);
					newReleasedVersion._updateReleasedOnly = true;
					newReleasedVersion.originalId = this.id;
					this.repository.onChange([
						newReleasedVersion
					]);
				}
			}
			this.logExit("_demoteVersionCompleted");
		},

		/**
		 * Returns a URL to retrieve the content of the document. For multi-segment or multi-part documents, this URL
		 * will only retrieve the first segment or part.
		 * 
		 * @param resultSet
		 *            Optional. Specify the resultSet to use as a basis for mapping content retrieval to the correct
		 *            document version. If not specified, this item's resultSet property will be referenced, if present.
		 * @param version
		 *            Optional. The version of the document to be retrieved, i.e., "current", "released", or "specific".
		 */
		getContentUrl: function(resultSet, version) {
			var servicesUrl = ecm.model.desktop.servicesUrl;
			var docId = this.id;
			var docName = this.name;
			var repositoryId = this.repository.id;
			var mimeType = this.mimetype || "";
			var repository = this.repository;
			var serverType = this.repository.type;
			var vsId = this.vsId; // required for p8 documents
			var replicationGroup = this.replicationGroup; // replicationGroup
			
			if (!this.template && this.id && this.repository && this.repository._isP8()){
				this.template = this.id.split(",", 1)[0];
			}

			if (!resultSet) {
				resultSet = this.resultSet;
			}
			var requestType = this.getContentUrlPath();
 			var docUrl = servicesUrl + "/jaxrs/" + serverType + requestType + encodeURIComponent(docId) + "&template_name=" + encodeURIComponent(this.template) + "&repositoryId=" + encodeURIComponent(repositoryId);
 			//var docUrl = servicesUrl + "/jaxrs/" + serverType + "/getDocument?docid=" + encodeURIComponent(docId) + "&template_name=" + encodeURIComponent(this.template) + "&repositoryId=" + encodeURIComponent(repositoryId);
			if (vsId) {
				version = version || this._getSearchVersion(resultSet) || this.version;

				if ((version != null && version != "specific") || (resultSet && resultSet.parentFolder)) {
					docUrl = docUrl + "&vsId=" + encodeURIComponent(vsId);
				}
			}
			if (version != null) {
				docUrl = docUrl + "&version=" + encodeURIComponent(version);
			}
			if (replicationGroup) {
				docUrl = docUrl + "&replicationGroup=" + replicationGroup;
			}
			if (this.isVirtualFolder) {
				docUrl = docUrl + "&virtualFolder=" + this.isVirtualFolder + "&appGroupId=" + this.appGroupId;
			}
			if (this.celement) {
				docUrl += "&element=" + this.celement;
			}
			docUrl = ecm.model.Request.setSecurityToken(docUrl);
			return docUrl;
		},
		
		/**
		 * Gets the content path to retrieve a ContentItem
		 */
		getContentUrlPath: function() {
			return "/getDocument?docid=";
		},
		
		/**
		 * Returns the default previewer to display when there is no other configured
		 */
		getDefaultPreviewerId: function() {
			return "htmlConversion" ;
		},

		/**
		 * Returns a URL to create an image of a page of the document.
		 * 
		 * @param pageNo
		 *            The page index (starting at 1 for the first page).
		 * @param scale
		 *            The scale of the page. 1.0 is the page at actual size (using 96 dpi). There are also special
		 *            values of -1.0 for fit width, -2.0 for fit height, and -3.0 for fit page.
		 * @param rotation
		 *            The rotation of the page. 0 is no rotation, 1 is rotated 90 degrees, 2 is rotated 180 degrees, 3
		 *            is rotated 270 degrees.
		 * @param inverted
		 *            Boolean, if true the page is color inverted.
		 * @param brightness
		 *            The brightness of the page, a value from 0.0 (darkest) to 2.0 (lightest), with 1.0 being original
		 *            brightness.
		 * @param contrast
		 *            The contrast of the page, a value from 0.0 (lowest contrast) to 2.0 (highest contrast), with 1.0
		 *            being original contrast.
		 * @param displayableWidth
		 *            The width in pixels available for display of the page. This is used in calculations of scale for
		 *            fit width and fit page.
		 * @param displayableHeight
		 *            The height in pixels available for display of the page. This is used in calculations of scale for
		 *            fit height and fit page.
		 * @param resultSet
		 *            Optional. Specify the resultSet to use as a basis for mapping content retrieval to the correct
		 *            document version. If not specified, this item's resultSet property will be referenced, if present.
		 */
		getPageImageUrl: function(pageNo, scale, rotation, inverted, brightness, contrast, displayableWidth, displayableHeight, resultSet) {
			if (!this.hasContent()) {
				return "";
			}
			var servicesUrl = ecm.model.desktop.servicesUrl;
			var pageImageUrl = servicesUrl + "/getPageImage.do?docUrl=" + encodeURIComponent(this.getContentUrl(resultSet)) + "&contentType=" + (this.mimetype || "") + "&serverType=" + this.repository.type + "&pageNo=" + pageNo;
			if (scale) {
				pageImageUrl += "&scale=" + scale;
			}
			if (rotation) {
				pageImageUrl += "&rotation=" + rotation;
			}
			if (inverted) {
				pageImageUrl += "&inverted=" + inverted;
			}
			if (brightness) {
				pageImageUrl += "&brightness=" + brightness;
			}
			if (contrast) {
				pageImageUrl += "&contrast=" + contrast;
			}
			if (displayableWidth) {
				pageImageUrl += "&displayableWidth=" + displayableWidth;
			}
			if (displayableHeight) {
				pageImageUrl += "&displayableHeight=" + displayableHeight;
			}

			// Pass the last modified timestamp so that the server's preview image lookup document URL
			// is different when a content update does not change the version.
			//
			// Otherwise updates that do not create a new version have the same document URL and the
			// cached image for the earlier document version is returned.
			//
			// Passing the timestamp outside the document URL portion keeps it private to this preview case.
			// The server preview code reads it then appends it to the document URL that is used to lookup
			// a previously generated image from the cache.
			var modifyDate = this.getModifyDate();
			if (modifyDate && modifyDate.length > 0) {
				var date = dojo_stamp.fromISOString(modifyDate);
				pageImageUrl += "&lastModified=" + date.valueOf();
			}

			pageImageUrl = ecm.model.Request.setSecurityToken(pageImageUrl);
			return pageImageUrl;
		},

		/**
		 * Returns a Javascript Object to create an image of a page of the document. This object is to be used with a
		 * JSON request.
		 * 
		 * @param pageNo
		 *            The page index (starting at 1 for the first page).
		 * @param scale
		 *            The scale of the page. 1.0 is the page at actual size (using 96 dpi). There are also special
		 *            values of -1.0 for fit width, -2.0 for fit height, and -3.0 for fit page.
		 * @param rotation
		 *            The rotation of the page. 0 is no rotation, 1 is rotated 90 degrees, 2 is rotated 180 degrees, 3
		 *            is rotated 270 degrees.
		 * @param inverted
		 *            Boolean, if true the page is color inverted.
		 * @param brightness
		 *            The brightness of the page, a value from 0.0 (darkest) to 2.0 (lightest), with 1.0 being original
		 *            brightness.
		 * @param contrast
		 *            The contrast of the page, a value from 0.0 (lowest contrast) to 2.0 (highest contrast), with 1.0
		 *            being original contrast.
		 * @param displayableWidth
		 *            The width in pixels available for display of the page. This is used in calculations of scale for
		 *            fit width and fit page.
		 * @param displayableHeight
		 *            The height in pixels available for display of the page. This is used in calculations of scale for
		 *            fit height and fit page.
		 */
		getPageImageRequestParameters: function(pageNo, scale, rotation, inverted, brightness, contrast, displayableWidth, displayableHeight) {
			if (!this.hasContent()) {
				return "";
			}

			//var servicesUrl = ecm.model.desktop.servicesUrl;
			//var pageImageUrl = servicesUrl + "/getPageImage.do?docUrl=" +  + "&contentType=" + (this.mimetype || "") + "&serverType=" + this.repository.type + "&pageNo=" + pageNo;

			var params = {};

			params.serverType = this.repository.type;
			params.docUrl = this.getContentUrl();

			if (pageNo) {
				params.pageNo = pageNo;
			}
			if (scale) {
				params.scale = scale;
			}
			if (rotation) {
				//pageImageUrl += "&rotation=" + rotation;
				params.rotation = rotation;
			}
			if (inverted) {
				//pageImageUrl += "&inverted=" + inverted;
				params.inverted = inverted;
			}
			if (brightness) {
				//pageImageUrl += "&brightness=" + brightness;
				params.brightness = brightness;
			}
			if (contrast) {
				//pageImageUrl += "&contrast=" + contrast;
				params.contrast = contrast;
			}
			if (displayableWidth) {
				//pageImageUrl += "&displayableWidth=" + displayableWidth;
				params.displayableWidth = displayableWidth;
			}
			if (displayableHeight) {
				//pageImageUrl += "&displayableHeight=" + displayableHeight;
				params.displayableHeight = displayableHeight;
			}

			// Pass the last modified timestamp so that the server's preview image lookup document URL
			// is different when a content update does not change the version.
			//
			// Otherwise updates that do not create a new version have the same document URL and the
			// cached image for the earlier document version is returned.
			//
			// Passing the timestamp outside the document URL portion keeps it private to this preview case.
			// The server preview code reads it then appends it to the document URL that is used to lookup
			// a previously generated image from the cache.
			var modifyDate = this.getModifyDate();
			if (modifyDate && modifyDate.length > 0) {
				var date = dojo_stamp.fromISOString(modifyDate);
				//pageImageUrl += "&lastModified=" + date.valueOf();
				params.lastModified = date.valueOf();
			}

			//pageImageUrl = ecm.model.Request.setSecurityToken(pageImageUrl);
			return params;
		},

		/**
		 * Simplified method for Video Preview request parameters
		 * Since we don't support altering the video, none of the paramters for images are required
		 * Requests a 5MB preview
		 */
		getPageVideoRequestParameters: function () {
			if (!this.hasContent()) {
				return "";
			}

			var params = {
				jsonRequest: true,
				serverType: this.repository.type,
				docUrl: this.getContentUrl(),
				docid: this.id,
				repositoryId: this.repository.id,
				Video: true,
				Range: "bytes=0-4999999",
				disposition: "inline" // don't request a download
			};

			var modifyDate = this.getModifyDate();
			if (modifyDate && modifyDate.length > 0) {
				var date = dojo_stamp.fromISOString(modifyDate);
				params.lastModified = date.valueOf();
			}

			return params;
		},

		/**
		 * Retrieves the thumbnail for the content item. This method only supports the Box repository type.
		 * 
		 * @param callback
		 *            A function that is called when the thumbnail retrieval has completed.
		 * @param params
		 *            An object containing additional parameters and request callbacks. Parameters include:
		 *            <ul>
		 *            <li>requestHeaders - Parameters intended for the Request Header. When requestHeaders is provided,
		 *            the caller is responsible for optionally setting the "Cache-Control" request header, as a default
		 *            option will not be set. When requestHeaders is not provided, "Cache-Control" "no-cache" is used.</li>
		 *            <li>requestParams - Parameters intended for the URL (for GET requests) or request body (for POST
		 *            requests).</li>
		 *            <li>cancellable - Flag indicating if the request can be canceled</li>
		 *            <li>notifyOnCancel - Flag indicating that if a cancellable request is canceled, a notification
		 *            will be sent to the service, so that it can clean up and exit immediately</li>
		 *            <li>backgroundRequest - Flag indicating if the request should be run in the background.</li>
		 *            <li>requestFailedCallback - Callback method called when a request returns from the server with
		 *            errors.</li>
		 *            </ul>
		 */
		retrieveThumbnail: function(callback, params) {
			this.logEntry("retrieveThumbnail");
			var request = null;

			// Method only supports Box repository connections
			if (this.repository.type != "box" || !this.hasContent() || this.mimetype == "application/octet-stream" || this.mimetype == "application/x-box-note" || this.mimetype == "application/vnd.google-apps.document" || this.mimetype == "application/vnd.google-apps.spreadsheet") {
				callback();
				return request;
			}

			// If the thumbnail has already been retrieved then return the existing thumbnail.
			if (this.getValue("thumbnail") != null) {
				callback();
			} else {
				if (!params)
					params = {};

				if (!params.requestParams)
					params.requestParams = {};

				params.requestParams.repositoryId = this.repository.id;
				params.requestParams.docid = this.id;
				params.requestCompleteCallback = lang.hitch(this, function(response) {
					this.attributes["thumbnail"] = response;
					this.attributeDisplayValues["thumbnail"] = response;
					if (callback)
						callback();
				});
				var errorback = params.requestFailedCallback;
				params.requestFailedCallback = lang.hitch(this, function(response) {
					// Box probably doesn't support thumbnails for the item's mime-type,
					// so set the thumbnail to "" to avoid making future requests
					this.attributes["thumbnail"] = "";
					this.attributeDisplayValues["thumbnail"] = "";
					if (errorback)
						errorback();
					else if (callback)
						callback();
				});
				request = ecm.model.Request.invokeServiceAPI("retrieveThumbnail", this.repository.type, params);
			}

			this.logExit("retrieveThumbnail");
			return request;
		},

		/**
		 * Returns an instance of {@link ecm.model.ContentItem} for the requested version of this content item.
		 * 
		 * @param version
		 *            Identifies a specific version to return. This can be a specific version string or one of the
		 *            following special strings:
		 *            <ul>
		 *            <li><code>"released"</code>
		 *            <p>
		 *            On FileNet P8 and CMIS, this is the released version. On Content Manager, this is the same as
		 *            <code>"current"</code>.
		 *            </p>
		 *            </li>
		 *            <p>
		 *            <li><code>"current"</code>
		 *            <p>
		 *            The current version. On FileNet P8 and CMIS, if minor versions exist this will be the newest minor
		 *            version, otherwise it will be the released version.
		 *            </p>
		 *            </li>
		 *            <p>
		 *            <li><code>"reservation"</code>
		 *            <p>
		 *            On FileNet P8 and CMIS, this is the check out reservation version. On Content Manager, this is the
		 *            same as the <code>"current"</code> version. On FileNet P8 and CMIS, if there is no reservation
		 *            version (no checkout) then null is returned.
		 *            </p>
		 *            </li>
		 *            </ul>
		 * @param callback
		 *            A function that is called when the version retrieval has completed.
		 * @param displayAllColumns
		 *            Optional. if it is set to true, this item's all properties will be returned.
		 */
		retrieveVersion: function(version, callback, displayAllColumns) {
			this.logEntry("retrieveVersion");
			var _this = this;
			// The version must be provided.
			if (!version || version.length == 0) {
				callback(null);
			} else {
				version = version.toLowerCase();

				// CM does not support "released" or "reservation". The best equivalent version type is "current".
				if (this.repository._isCM()) {
					if ((version == "released") || (version == "reservation")) {
						version = "current";
					}
				}

				var params = {
					repositoryId: this.repository.id,
					requestedVersion: version,
					docid: this.id
				};

				if (this.repository._isP8()) {
					params.objectStoreId = this.objectStore ? this.objectStore.id : "";
				}
				
				if (this.repository._isCM() && this.resultSet && this.resultSet.showChildComponentAttribute) {
					params.showChildComponentAttribute = "true";
				}
				
				if (displayAllColumns && displayAllColumns == true) {
					params.displayAllColumns = "true";
				}

				var request = ecm.model.Request.invokeService("getDocumentVersions", this.repository.type, params, function(response) {
					var docItem = null;
					if (response.rows && response.rows[0]) {
						docItem = ecm.model.ContentItem.createFromJSON(response.rows[0], _this.repository, null, null);
					}
					callback(docItem);
				}, true);
			}
			this.logExit("retrieveVersion");
			return request;
		},

		/**
		 * Retrieves an {@link ecm.model.ResultSet} object containing all versions for this item.
		 * 
		 * @param callback
		 *            A function that is called when the version retrieval has completed.
		 */
		retrieveAllVersions: function(callback) {
			this.logEntry("retrieveAllVersions");
			if (this.repository) {
				this.repository.retrieveVersions(this, null, callback);
			}
			this.logExit("retrieveAllVersions");
		},

		/**
		 * Only valid for folders, if the folder is in a teamspace instance, retrieve the Teamspace object for FileNet
		 * P8. The folder path determines whether it will try to fetch the teamspace (by checking for
		 * <code>"ClbTeamspaces"</code> in the path). If <code>"ClbTeamspaces"</code> is not in the path, then this
		 * method will not try to get the object.
		 * 
		 * @param callback
		 *            A function that is called when the version retrieval has completed, with the Teamspace object as
		 *            the argument, or null if no teamspace.
		 * @param params
		 *            An object containing parameters to control the request to the server. For example, you can set the
		 *            retrieve to be performed in the background. See {@link ecm.model.Request} for a list of parameters
		 *            supported by a server request.
		 */
		retrieveTeamspace: function(callback, params) {
			if (this._teamspace) {
				callback(this._teamspace);
			} else {
				this._teamspace = null;
				if (this.repository._isP8() && this.repository.teamspacesEnabled) {
					var repository = this.repository;
					// get the path of the teamspace root folder
					var path = this.getValue("PathName");

					var process = function() {
						if (path && path.indexOf("/ClbTeamspaces/") == 0) {
							var teamspacepath = null;

							// See if the path has YYYY/MM after the ClbTeamspaces name. If so, adjust the index accordingly.
							var pathPrefix = path.substring(0, 22);
							var startIndex = 0;
							if (pathPrefix.match("\\d{4}\\/\\d{2}") != null) {
								startIndex = 23;
							} else {
								startIndex = 15;
							}
							var indx = path.indexOf("/", startIndex);

							if (indx > 0)
								teamspacepath = path.substring(0, indx);
							else
								teamspacepath = path;
							var self = this;
							if (teamspacepath) {
								repository.retrieveTeamspaceById(teamspacepath, ecm.model.Teamspace.INSTANCE, function(teamspace) {
									teamspace.initFromJson();
									self._teamspace = teamspace;
									callback(teamspace);
								}, params);
							} else {
								callback(null);
							}
						} else {
							callback(null);
						}
					};
					// In some cases like search results the path is not retrieved unless the use selects 
					// the folder first.  Hence, if no path then retrieve all attributes.
					if (!path) {
						this.retrieveAttributes(lang.hitch(this, function(item) {
							path = this.getValue("PathName");
							process();
						}), false, false, params ? params.requestFailedCallback : null);
					} else {
						process();
					}

				} else if (this.repository._isCM() && this.repository.teamspacesEnabled) {
					this._retrieveCMTeamspace(callback, params);
				} else {
					callback(null);
				}
			}
		},

		_retrieveCMTeamspace: function(callback, params) {
			this.logEntry("_retrieveCMTeamspace");
			var self = this;
			if (!params) {
				params = {};
			}
			params.requestParams = {
				repositoryId: this.repository.id,
				id: this.id
			};
			params.requestCompleteCallback = lang.hitch(this, function(response) {
				if (response.workspaces.length > 0) {
					var json = response.workspaces[0];
					json.repository = this.repository;
					var teamspace = new ecm.model.Teamspace(json);
					teamspace.initFromJson();
					self._teamspace = teamspace;
					callback(teamspace);
				} else {
					callback(null);
				}
			});
			var request = ecm.model.Request.invokeServiceAPI("retrieveItemTeamspace", this.repository.type, params);
			this.logExit("_retrieveCMTeamspace");
			return request;
		},

		/**
		 * Retrieves the marking set values for the content class of this item.
		 * 
		 * @param properties
		 *            An array of current property values that will be merged with the marking set values.
		 */
		getMarkingValues: function(properties) {
			var markingValues = [];
			var contentClass = this.getContentClass();
			var markingProperties = contentClass.markingProperties;
			if (markingProperties) {
				var attributes;
				if (properties) { // Merge changed properties into default attributes
					attributes = lang.clone(this.attributes); // Don't want to pollute the default attributes
					dojo_array.forEach(properties, function(property) {
						if (markingProperties[property.name]) {
							attributes[property.name] = property.value;
						}
					});
				} else {
					attributes = this.attributes;
				}
				for (i in attributes) { // Loop through attribute set to pick up hidden attributes too.					
					if (attributes[i]) {
						var markings = markingProperties[i];
						if (markings) {
							var value = attributes[i] instanceof Array ? attributes[i].join() : attributes[i];
							if (value.length > 0) {
								markingValues.push(attributes[i]);
							}
						}
					}
				}
			}
			return markingValues;
		},

		/**
		 * Determines whether this item can be collaborated on with the given type of social collaboration feature, such
		 * as likes (recommendations) or comments. Checks whether the social feature that is given by the type parameter
		 * is available in the repository where the item is stored, and whether the current user has the security
		 * privileges to collaborate on the item. Returns {Boolean} true if the given type of social collaboration is
		 * available on this item.
		 * 
		 * @param type
		 *            The type of the social collaboration as defined in {@link ecm.model.SocialItem.TYPE}. Checks all
		 *            types if not set.
		 * @param repositoryCheckOnly
		 *            A boolean value indicating whether to check if the type is available in the repository without
		 *            checking if the current user has the security privileges to collaborate.
		 * @since 2.0.3
		 */
		isAvailableForSocialCollaboration: function(type, repositoryCheckOnly) {
			var collaboratable = false;
			if (type == SocialItem.prototype.TYPE.COMMENT || !type && !collaboratable)
				collaboratable = this.isCommentable(repositoryCheckOnly);
			if (type == SocialItem.prototype.TYPE.RECOMMENDATION || !type && !collaboratable)
				collaboratable = this.isRecommendable(repositoryCheckOnly);
			if (type == SocialItem.prototype.TYPE.DOWNLOAD || !type && !collaboratable)
				collaboratable = this.isDownloadCountable(repositoryCheckOnly);
			if (type == SocialItem.prototype.TYPE.TAG || !type && !collaboratable)
				collaboratable = this.isTaggable(repositoryCheckOnly);

			return collaboratable;
		},

		/**
		 * Returns true if this item can be marked as taggable by the current user.
		 * 
		 * @param repositoryCheckOnly
		 *            A boolean value indicating whether to check if the type is available in the repository only
		 *            without checking if the current user has the security privileges.
		 * @since 2.0.3
		 */
		isTaggable: function(repositoryCheckOnly) {
			if (this.repository._isBox() ? this.template == "web_link" : this.isFolder())
				return false;

			var os = this.getObjectStore();
			var repo = os ? os : this.repository;
			if (!repo.supportsTag)
				return false;

			if (!repositoryCheckOnly && !this.hasPrivilege("privEditProperties"))
				return false;

			return true;
		},

		/**
		 * Returns true if this item can be marked as recommendable by the current user.
		 * 
		 * @param repositoryCheckOnly
		 *            A boolean value indicating whether to check if the type is available in the repository only
		 *            without checking if the current user has the security privileges.
		 * @since 2.0.3
		 */
		isRecommendable: function(repositoryCheckOnly) {
			if (this.isFolder())
				return false;
			var os = this.getObjectStore();
			var repo = os ? os : this.repository;
			if (!repo.supportsRecommendation)
				return false;
			if (!repositoryCheckOnly && !this.hasPrivilege("privViewDoc"))
				return false;

			return true;
		},

		/**
		 * Returns true if the repository supports download counts and this item can be downloaded by the current user.
		 * 
		 * @param repositoryCheckOnly
		 *            A boolean value indicating whether to check if the type is available in the repository only
		 *            without checking if the current user has the security privileges.
		 * @since 2.0.3
		 */
		isDownloadCountable: function(repositoryCheckOnly) {
			if (this.isFolder())
				return false;
			var os = this.getObjectStore();
			var repo = os ? os : this.repository;
			if (!repo.supportsDownloadCount)
				return false;
			if (!repositoryCheckOnly && !this.hasPrivilege("privViewDoc"))
				return false;

			return true;
		},

		/**
		 * Returns true if this item can be commented on by the current user.
		 * 
		 * @param repositoryCheckOnly
		 *            A boolean value indicating whether to check if the type is available in the repository only
		 *            without checking if the current user has the security privileges.
		 * @since 2.0.2
		 */
		isCommentable: function(repositoryCheckOnly) {
			var os = this.getObjectStore();
			var repo = os ? os : this.repository;
			if (!repo.capabilityComment || repo.capabilityComment == this.repository.CAPABILITY_COMMENT.NONE)
				return false;
//			if (this.isCustomObject())
//				return false;
			if (repo.capabilityComment == this.repository.CAPABILITY_COMMENT.DOCUMENT_ONLY && (this.repository._isBox() ? this.template != "file" : this.isFolder()))
				return false;

			if (!repositoryCheckOnly && !this.hasPrivilege(this.repository._isBox() ? "privComment" : "privViewDoc"))
				return false;

			return true;
		},
		
		/**
		 * Determines whether this item can be collaborated on with the given type of Box collaboration feature, such as
		 * Box share. Checks whether the social feature that is given by the type parameter is available in the
		 * repository where the item is stored, and whether the current user has the security privileges to collaborate
		 * on the item. Returns {Boolean} true if the given type of Box collaboration is available on this item.
		 * 
		 * @param collaborationType
		 *            The type of the Box collaboration as defined in
		 *            {@link ecm.model.BoxCollaborationRecord.COLLABORATION_TYPE}. Checks all types if not set.
		 * @param repositoryCheckOnly
		 *            A boolean value indicating whether to check if the type is available in the repository without
		 *            checking if the current user has the security privileges to collaborate.
		 * @since 2.0.3.6
		 */
		isAvailableForBoxCollaboration: function(collaborationType, repositoryCheckOnly) {
			var collaboratable = false;
			if (collaborationType == BoxCollaborationRecord.prototype.COLLABORATION_TYPE.SHARE || !collaborationType && !collaboratable)
				collaboratable = this.isBoxSharable(repositoryCheckOnly);

			return collaboratable;
		},

		/**
		 * Returns true if this item can be marked as Box sharable by the current user.
		 * 
		 * @param repositoryCheckOnly
		 *            A boolean value indicating whether to check if the type is available in the repository only
		 *            without checking if the current user has the security privileges.
		 * @since 2.0.3.6
		 */
		isBoxSharable: function(repositoryCheckOnly) {
			if (this.isFolder())
				return false;
			var os = this.getObjectStore();
			var repo = os ? os : this.repository;
			if (!repo.supportsBoxShare)
				return false;
			if (!repositoryCheckOnly && !this.hasPrivilege("privViewDoc"))
				return false;

			return true;
		},

		/**
		 * Returns true if this item can have a notelog.
		 */
		//story 26656
		isNotelogable: function() {
			if (!this.repository._isCM())
				return false;
			if (!this.hasPrivilege("privViewNotes"))
				return false;
			return true;
		},

		/**
		 * Retrieves the comments of this item.
		 * 
		 * @param callback
		 *            A function that is called after comments are retrieved.
		 * @since 2.0.2
		 */
		retrieveComments: function(callback, errorback) {
			var methodName = "retrieveComments";
			this.logEntry(methodName);

			var params = {
				repositoryId: this.repository.id,
				itemId: this.id
			};

			var request = ecm.model.Request.invokeService("retrieveComments", this.repository.type, params, lang.hitch(this, function(response) {
				response.repository = this.repository;
				response.contentItem = this;
				var resultSet = ContentItem.createResultSet(response);
				if (lang.isFunction(callback))
					callback(resultSet);
			}), false, false, function(response) {
				if (lang.isFunction(errorback))
					errorback(response);
			});

			this.logExit(methodName);

			return request;
		},
		
		/**
		 * Retrieves the bookmarks of this item.
		 * 
		 * @param callback
		 *            A function that is called after bookmarks are retrieved.
		 */
		retrieveBookmarks: function(callback, errorback) {
			var methodName = "retrieveBookmarks";
			this.logEntry(methodName);

			var params = {
				repositoryId: this.repository.id,
				itemId: this.id
			};

			var request = ecm.model.Request.invokeService("getVideoBookmarks", this.repository.type, params, lang.hitch(this, function(response) {
				response.repository = this.repository;
				response.contentItem = this;
				var resultSet = ContentItem.createResultSet(response);
				if (lang.isFunction(callback))
					callback(resultSet);
			}), false, false, function(response) {
				if (lang.isFunction(errorback))
					errorback(response);
			});

			this.logExit(methodName);

			return request;
		},

		/**
		 * Fired when a comment has changed for the item.
		 * 
		 * @param comment
		 *            Instance of {@link ecm.model.Comment}.
		 * @param added
		 *            A boolean value indicating whether the comment was added (true) or edited (false)
		 * @since 2.0.2
		 * @deprecated replaced by onCollaborate().
		 */
		onCommentChanged: function(comment, added) {
		},
		
		/**
		 * Fired when collaborated on this item.
		 * 
		 * @param socialItem
		 *            Instance of {@link ecm.model.SocialItem}.
		 * @param added
		 *            A boolean value indicating whether the social item was added (true) or edited (false)
		 * @param skipOnChange
		 *            A boolean value to skip calling <code>onChange()</code> method.
		 * @since 2.0.3
		 */
		onCollaborate: function(socialItem, added, skipOnChange) {
			if (!skipOnChange) {
				this.onChange([
					this
				]);
			}
		},

		/**
		 * Fired when a video annotation is created/deleted on this item.
		 * 
		 * @param videoAnnotation
		 *            Instance of {@link ecm.model.SocialItem}.
		 * @param added
		 *            A boolean value indicating whether a video annotation item was added (true) or edited (false)
		 * @param skipOnChange
		 *            A boolean value to skip calling <code>onChange()</code> method.
		 */
		onVideoAnnotation: function(videoAnnotation, added, skipOnChange) {
			if (!skipOnChange) {
				this.onChange([
					this
					]);
			}
		},
		
		/**
		 * Retrieves the notelog of this item.
		 * 
		 * @param callback
		 *            A function that is called after the notelog is retrieved.
		 * @param errorback
		 *            A function that is called after an error occurs.
		 * @since 2.0.2
		 */
		retrieveNotelogs: function(callback, errorback, background) {
			var methodName = "retrieveNotelogs";
			this.logEntry(methodName);

			if (!this.isNotelogable())
				return;

			var params = {
				repositoryId: this.repository.id,
				docid: this.id
			};
			var backgroundRequest = false;
			if (background != undefined && background != null && background == true) {
				backgroundRequest = true;
			}
			var request = ecm.model.Request.invokeService("getNotes", this.repository.type, params, function(response) {
				if (callback) {
					response.repository = this.repository;
					response.contentItem = this;
					response.setType = "comment";
					var resultSet = ContentItem.createResultSet(response);
					callback(resultSet);
				}
			}, false, false, function(response) {
				if (errorback)
					errorback(response);
			}, backgroundRequest);

			this.logExit(methodName);

			return request;
		},

		/**
		 * Appends content to the notelog of this item.
		 * 
		 * @param callback
		 *            A function that is called after the notelog is retrieved.
		 * @param errorback
		 *            A function that is called after an error occurs.
		 * @param content
		 *            The content that will be appended to the notelog.
		 * @param createVersion
		 *            Specification of whether to create a new notelog version. The result also depends on the setting
		 *            of notelog part version control in the Content Manager server.
		 * @since 2.0.2
		 */
		addNotelog: function(content, createVersion, callback, errorback, background) {
			var methodName = "addNotelog";
			this.logEntry(methodName);

			if (!this.isNotelogable())
				return;
			var backgroundRequest = false;
			if (background != undefined && background != null && background == true) {
				backgroundRequest = true;
			}
			var params = {
				repositoryId: this.repository.id,
				docid: this.id,
				text: encodeURIComponent(content),
				parm_create_new_version: createVersion
			};

			var request = ecm.model.Request.invokeService("addNote", this.repository.type, params, function(response) {
				if (callback) {
					response.repository = this.repository;
					response.contentItem = this;
					response.setType = "comment";
					var resultSet = ContentItem.createResultSet(response);
					callback(resultSet);
				}
			}, false, false, function(response) {
				if (errorback)
					errorback(response);
			}, backgroundRequest);

			this.logExit(methodName);

			return request;
		},

		/**
		 * Updates the notelog of this item.
		 * 
		 * @param callback
		 *            A function that is called after the notelog is retrieved.
		 * @param errorback
		 *            A function that is called after an error occurs.
		 * @param content
		 *            The content that will be appended to the notelog.
		 * @param createVersion
		 *            Specification of whether to create a new notelog version. The result also depends on the setting
		 *            of notelog part version control in the Content Manager server.
		 * @since 2.0.2
		 */
		updateNotelogs: function(content, createVersion, callback, errorback, background) {
			var methodName = "updateNotelogs";
			this.logEntry(methodName);

			if (!this.isNotelogable())
				return;
			var backgroundRequest = false;
			if (background != undefined && background != null && background == true) {
				backgroundRequest = true;
			}
			var params = {
				repositoryId: this.repository.id,
				docid: this.id,
				text: encodeURIComponent(content),
				parm_create_new_version: createVersion
			};

			var request = ecm.model.Request.invokeService("updateNotelogs", this.repository.type, params, function(response) {
				if (callback) {
					response.repository = this.repository;
					response.contentItem = this;
					response.setType = "comment";
					var resultSet = ContentItem.createResultSet(response);
					callback(resultSet);
				}
			}, false, false, function(response) {
				if (errorback)
					errorback(response);
			}, backgroundRequest);

			this.logExit(methodName);

			return request;
		},

		/**
		 * Retrieves Entry Templates that are associated with the folder.
		 * 
		 * @param callback
		 *            A function that is called after the associated entry templates are retrieved.
		 * @param rootFolderId
		 *            The folder id that the association search will stop when reaching this id.
		 * @param getParentAssociations
		 *            The boolean value that control if just retrieving parent assoications, not retrieve current
		 *            folder's.
		 * @since 2.0.3
		 */
		retrieveEntryTemplateFolderAssociations: function(callback, rootFolderId, getParentAssociations) {
			var methodName = "retrieveEntryTemplateFolderAssociations";
			this.logEntry(methodName);

			if (!this.isFolder() || (!this.repository._isP8() && !this.repository._isCM()))
				return null;
			var params = {
				repositoryId: this.repository.id,
				resultsType: "",
				filter_type: "all",
				folderDocid: this.id,
				rootFolderId: rootFolderId,
				getParentAssociations: getParentAssociations
			};

			var self = this;
			var request = ecm.model.Request.invokeService("getEntryTemplates", this.repository.type, params, function(response) {
				callback(response);
			}, false, false);

			this.logExit(methodName);

			return request;
		},

		/**
		 * Saves Entry Templates that are associated with the folder.
		 * 
		 * @param callback
		 *            A function that is called after the associated entry templates are saved
		 * @param entryTemplateFolderAssociations
		 *            An array of EntryTemplateFolderAssociation. It will be saved as annotation to p8 folder.
		 * @param checkIn
		 *            A boolean value indicating whether this operation should check in the item.
		 * @since 2.0.3
		 */
		saveEntryTemplateFolderAssociations: function(callback, entryTemplateFolderAssociations, checkIn) {
			var methodName = "saveEntryTemplateFolderAssociations";
			this.logEntry(methodName);

			if (!this.isFolder() || (!this.repository._isP8() && !this.repository._isCM()))
				return null;

			var data = [];
			var entryTemplates = [];
			dojo.forEach(entryTemplateFolderAssociations, function(item, index) {
				var etAssoc = {
					currentFolderAsParent: item.currentFolderAsParent,
					isDefault: item.isDefault,
					fileTypes: item.fileTypes,
				};
				if (this.repository._isP8()) {
					etAssoc.type = item.entryTemplate.attributes.TargetObjectType;
					etAssoc.entryTemplateVsId = item.entryTemplate.vsId;
				} else if (this.repository._isCM()) {
					etAssoc.type = item.entryTemplate.attributes.clbETType;
					etAssoc.entryTemplateItemId = item.entryTemplate.itemId;
				}
				data.push(etAssoc);
				entryTemplates.push(item.entryTemplate);
			}, this);

			var params = {
				repositoryId: this.repository.id,
				folderDocid: this.id
			};

			if (checkIn) {
				params.parm_checkIn = true;
			}

			var self = this;
			var request = ecm.model.Request.postService("saveEntryTemplateFolderAssociations", this.repository.type, params, "text/json", JSON.stringify(data), lang.hitch(this, function(response) {
				self._clearEntryTemplateFolderAssociationsToCache();
				// If this is a CM folder and a result item was returned, the result item is the checked in version of this CM folder.
				if (this.repository._isCM() && response.rows && response.rows[0]) {
					this._checkInCompleted(response, callback);
				} else {
					if (callback) {
						callback(response);
					}
				}
			}));

			this.logExit(methodName);

			return request;
		},

		/**
		 * @private clear associated entry template to cache
		 */
		_clearEntryTemplateFolderAssociationsToCache: function() {
			if (this.repository) {
				var entryTemplateCache = this.repository.entryTemplateCache;
				var objectStore = this.repository.objectstore;
				var folderId = this.id;
				if (folderId && entryTemplateCache) {
					if (entryTemplateCache.byFolderId) {
						entryTemplateCache.byFolderId = {};
					}
				}
			}
		},

		/**
		 * Retrieves the download records for a FileNet P8 document.
		 * 
		 * @param callback
		 *            A function that is called after the records are retrieved.
		 * @since 2.0.2
		 */
		retrieveDownloadRecords: function(callback) {
			var methodName = "retrieveDownloadRecords";
			this.logEntry(methodName);

			var params = {
				repositoryId: this.repository.id,
				itemId: this.id
			};

			var request = ecm.model.Request.invokeService("retrieveDownloadRecords", this.repository.type, params, lang.hitch(this, function(response) {
				if (callback) {
					response.repository = this.repository;
					response.contentItem = this;
					var resultSet = ContentItem.createResultSet(response);
					callback(resultSet);
				}
			}));

			this.logExit(methodName);

			return request;
		},

		/**
		 * Retrieves the recommendations made to this item.
		 * 
		 * @param callback
		 *            A function that is called after the recommendations are retrieved.
		 * @param errorback
		 *            A function that is called after an error occurs.
		 * @since 2.0.3
		 */
		retrieveRecommendations: function(callback, errorback) {
			var methodName = "retrieveRecommendations";
			this.logEntry(methodName);

			var params = {
				repositoryId: this.repository.id,
				itemId: this.id
			};

			var request = ecm.model.Request.invokeService("retrieveRecommendations", this.repository.type, params, lang.hitch(this, function(response) {
				response.repository = this.repository;
				response.contentItem = this;
				var resultSet = ContentItem.createResultSet(response);
				if (lang.isFunction(callback))
					callback(resultSet);
			}), false, false, function(response) {
				if (lang.isFunction(errorback))
					errorback(response);
			});

			this.logExit(methodName);

			return request;
		},

		/**
		 * Retrieves the item's tags.
		 * 
		 * @param callback
		 *            A function that is called after tags are retrieved.
		 * @param errorback
		 *            A function that is called after an error occurs.
		 * @since 2.0.3
		 */
		retrieveTags: function(callback, errorback) {
			var methodName = "retrieveTags";
			this.logEntry(methodName);

			var params = {
				repositoryId: this.repository.id,
				template_name: this.template,
				itemId: this.id
			};

			var request = ecm.model.Request.invokeService("retrieveTags", this.repository.type, params, lang.hitch(this, function(response) {
				if (response.privileges)
					this.privileges = response.privileges;
				response.repository = this.repository;
				response.contentItem = this;
				var resultSet = ContentItem.createResultSet(response);
				if (lang.isFunction(callback))
					callback(resultSet);
			}), false, false, function(response) {
				if (lang.isFunction(errorback))
					errorback(response);
			});

			this.logExit(methodName);

			return request;
		},

		/**
		 * Adds tags to the item.
		 * 
		 * @param: tags A string containing tags separated by a space, a comma, or semicolon, or a string array of tags
		 *         to add to the item.
		 * @param callback
		 *            A function that is called after the tags are added.
		 * @param errorback
		 *            A function that is called after an error occurs.
		 * @param skipOnChange
		 *            A boolean indicating if an <code>onChange</code> event should be skipped.
		 */
		addTags: function(tags, callback, errorback, skipOnChange) {
			if (!tags)
				return;

			var methodName = "addTags";
			this.logEntry(methodName);

			if (!this.id) {
				this.logWarning(methodName, "no content item set");
				return;
			}
			if (!this.isTaggable()) {
				this.logWarning(methodName, "social item is not taggable");
				return;
			}

			var request = ecm.model.Request.invokeService("saveTag", this.repository.type, {
				repositoryId: this.repository.id,
				itemId: this.id,
				type: SocialItem.prototype.TYPE.TAG,
				value: tags instanceof Array ? null : tags,
				values: tags instanceof Array ? tags : null,
				template_name: this.template
			}, lang.hitch(this, function(response) {
				response.repository = this.repository;
				response.contentItem = this;
				var resultSet = ContentItem.createResultSet(response);
				if (lang.isFunction(callback))
					callback(resultSet);
				if (resultSet.items instanceof Array && resultSet.items.length > 0)
					this.onCollaborate(resultSet.items[0], true, skipOnChange);
			}), false, false, function(response) {
				if (errorback)
					errorback(response);
			});

			this.logExit(methodName);

			return request;
		},

		/**
		 * Returns a boolean indicating if the user has permissions to delete shares. (For P8, call
		 * hasPrivilegeToDeleteShareCallback in order to make sure the access mask is retrieved.)
		 * 
		 * @since 2.0.3.6
		 */
		hasPrivilegeToDeleteShare: function() {
			var readOnly = !this.hasPrivilege("privEditProperties");
			if (this.repository && this.repository.type == "cm") {
				readOnly = !this.hasPrivilege("privEditProperties") || !this.hasPrivilege("privCheckOutDoc");
			}
			if (readOnly && this.hasPrivilege("privViewDoc")) {
				var shareRecord = this._getShareCollaborationRecord();
				if (!shareRecord) {
					return false;
				} else if (shareRecord.getOriginatorShortName() != this.repository.userId) { // If no edit permission & and didn't originated the share, then can't delete share or update the share options 
					return false;
				}
			}
			return true;
		},

		/**
		 * Returns a boolean to the callback indicating if the user has permissions to delete the share.
		 * 
		 * @since 2.0.3.6
		 */
		hasPrivilegeToDeleteShareCallback: function(callback) {
			if (this.repository && this.repository.type == "p8") {
				// p8 doesn't return the correct permissions when it does an outer join to get the share data; 
				// therefore, need to get the item's attributes to get the correct permissions
				if (this.accessMaskNotRetrieved != undefined && this.accessMaskNotRetrieved == true) {
					this.retrieveAttributes(lang.hitch(this, function() {
						this.accessMaskNotRetrieved = null;
						callback(this.hasPrivilegeToDeleteShare());
					}), null, null, lang.hitch(this, function() {
						callback(false);
					}));
				} else {
					callback(this.hasPrivilegeToDeleteShare());
				}
			} else if (this.repository && this.repository.type == "cm") {
				callback(this.hasPrivilegeToDeleteShare());
			} else {
				callback(false);
			}
		},

		/**
		 * Removes a share from a document copied to Box.
		 * 
		 * @param callback
		 *            A function that is called after the share has been deleted.
		 * @since 2.0.3.6
		 */
		deleteShare: function(callback) {
			var shareRecord = this._getShareCollaborationRecord();
			if (shareRecord == null) {
				if (callback) {
					callback({});
				}
				return;
			}

			var _self = this;
			var request = ecm.model.Request.invokeService("deleteShare", null, {
				desktop: ecm.model.desktop.id,
				repositoryId: this.repository.id,
				repositoryType: this.repository.type,
				docid: shareRecord.attributes.itemId,
				boxShareId: shareRecord.attributes.boxFileId,
				boxClientId: shareRecord.attributes.boxClientId
			}, function(response) {
				_self._deleteShareRecord();
				if (callback) {
					callback(response);
				}
			}, false, false);
		},

		_deleteShareRecord: function(skipOnChange) {
			// Delete the share record corresponding to this share.
			var thisShareRecord = this._getShareCollaborationRecord();
			for (var i = 0; i < this.boxShareRecords.length; i++) {
				var shareRecord = this.boxShareRecords[i];
				if (shareRecord.attributes.collaborationType == "share" && shareRecord.attributes.boxClientId == thisShareRecord.attributes.boxClientId) {
					this.boxShareRecords.splice(i, 1);
					this._shareStatus = null;
					break;
				}
			}
			if (!skipOnChange) {
				this.onChange([
					this
				]);
			}
		},

		/**
		 * Returns information about whether the item is shared.
		 * 
		 * @param callback
		 *            A function that is called after the recommendations are retrieved.
		 * @since 2.0.3.6
		 */
		getShareData: function(callback) {
			var methodName = "getShareData";
			this.logEntry(methodName);

			var shareRecord = this._getShareCollaborationRecord();
			if (shareRecord == null) {
				if (callback) {
					var response = {};
					if (this.repository.type == "p8" && this.attributes && this.attributes.MajorVersionNumber != undefined && this.attributes.MinorVersionNumber != undefined) {
						response.currentVersion = this.attributes.MajorVersionNumber + "." + this.attributes.MinorVersionNumber;
					} else if (this.repository.type == "cm" && this.attributes && this.attributes.icn_sys_version) {
						response.currentVersion = this.attributes.icn_sys_version;
					}
					if (response.currentVersion != undefined) {
						callback(response);
					} else {
						this.repository.retrieveItem(this.id, lang.hitch(this, function(version) {
							if (this.repository.type == "p8" && version.attributes && version.attributes.MajorVersionNumber != undefined && version.attributes.MinorVersionNumber != undefined) {
								response.currentVersion = version.attributes.MajorVersionNumber + "." + version.attributes.MinorVersionNumber;
							} else if (this.repository.type == "cm" && version.attributes && version.attributes.icn_sys_version) {
								response.currentVersion = version.attributes.icn_sys_version;
							}
							callback(response);
						}));
					}
				}
				return;
			}

			if (this._isShareRecordForThis(shareRecord)) {
				var _self = this;
				var request = ecm.model.Request.invokeService("getShareStatus", null, {
					desktop: ecm.model.desktop.id,
					repositoryId: this.repository.id,
					repositoryType: this.repository.type,
					docid: this.id,
					boxShareId: shareRecord.attributes.boxFileId,
					boxClientId: shareRecord.attributes.boxClientId
				}, function(response) {
					if (this.repository.type == "p8") {
						response.currentVersion = _self.attributes.MajorVersionNumber + "." + _self.attributes.MinorVersionNumber;
						if (response.link) {
							// For P8, we can tell the share information is for this version
							response.isAnotherVersionShared = false;
						} else {
							_self._deleteShareRecord();
						}
						callback(response);
					} else if (this.repository.type == "cm") {
						// For CM8, we need to iterate through the versions to see which one the share information is for.
						if (response.link) {
							var getShareDataResponse = response;

							// If we have version number information available, see if the version we are checking is the shared
							// version
							var sharedVersion = _self.getSharedVersionNumber();
							if (_self.attributes.icn_sys_version && sharedVersion != "") {
								getShareDataResponse.currentVersion = _self.attributes.icn_sys_version;
								if (_self.attributes.icn_sys_version == sharedVersion) {

									// This is the shared version
									getShareDataResponse.isAnotherVersionShared = false;
								} else {
									getShareDataResponse.isAnotherVersionShared = true;
									getShareDataResponse.versionShared = shareRecord.getItemVersion();
								}
								callback(getShareDataResponse);
							} else {
								_self.retrieveAllVersions(lang.hitch(_self, function(versions) {
									for (var i = 0; i < versions.items.length; i++) {
										var version = versions.items[i];
										if (version.id == this.id) {
											getShareDataResponse.currentVersion = version.attributes.icn_sys_version;
										}
										if (shareRecord.attributes.itemVersion == version.attributes.icn_sys_version) {
											// This is the version for the share record.
											if (i == 0) {
												// If it's for the first version in the list, it's the current version
												getShareDataResponse.isAnotherVersionShared = false;
											} else {
												getShareDataResponse.isAnotherVersionShared = true;
												getShareDataResponse.versionShared = shareRecord.getItemVersion();
											}
										}
									}
									callback(getShareDataResponse);
								}));
							}
						} else {
							_self._deleteShareRecord();
							callback(response);
						}
					}
				}, false, false);
			} else {
				this.repository.retrieveItem(shareRecord.attributes.itemId, lang.hitch(this, function(version) {
					var laterVersionShared = false;
					if ((version.attributes.MajorVersionNumber > this.attributes.MajorVersionNumber) || (version.attributes.MajorVersionNumber == this.attributes.MajorVersionNumber && version.attributes.MinorVersionNumber > this.attributes.MinorVersionNumber)) {
						// The shared version is later than this document. Don't allow sharing in this case.
						laterVersionShared = true;
					}
					// Get share information for the other version.
					var _self = this;
					var request = ecm.model.Request.invokeService("getShareStatus", null, {
						desktop: ecm.model.desktop.id,
						repositoryId: this.repository.id,
						repositoryType: this.repository.type,
						docid: shareRecord.attributes.itemId,
						boxShareId: shareRecord.attributes.boxFileId,
					}, function(response) {
						if (_self.repository.type == "p8") {
							response.currentVersion = _self.attributes.MajorVersionNumber + "." + _self.attributes.MinorVersionNumber;
						} else if (_self.repository.type == "cm") {
							response.currentVersion = _self.attributes.icn_sys_version;
						}
						if (response.link) {
							response.isAnotherVersionShared = true;
							response.versionShared = shareRecord.getItemVersion();
						} else {
							_self._deleteShareRecord();
						}
						response.laterVersionShared = laterVersionShared;
						callback(response);
					}, false, false);
				}));
			}
		},

		/**
		 * Returns the version number of a document in this version series that is shared.
		 * 
		 * @since 2.0.3.6
		 */
		getSharedVersionNumber: function() {
			var sharedVersionNumber = "";

			var shareRecord = this._getShareCollaborationRecord();
			if (shareRecord != null) {
				sharedVersionNumber = shareRecord.attributes.itemVersion;
			}

			return sharedVersionNumber;
		},

		/**
		 * Returns the item ID of a document in this version seriese that is shared. P8 only.
		 * 
		 * @since 2.0.3.6
		 */
		getSharedItemId: function() {
			var sharedItemId = "";

			var shareRecord = this._getShareCollaborationRecord();
			if (shareRecord != null) {
				sharedItemId = shareRecord.attributes.itemId;
			}

			return sharedItemId;
		},

		/**
		 * Shares a document to Box.
		 * 
		 * @param data
		 *            An object holding data about the share to be created.
		 * @param callback
		 *            A function that is called after the recommendations are retrieved.
		 * @since 2.0.3.6
		 */
		share: function(data, callback) {
			this.logEntry("share");

			if (data.shareMode == "0" || data.shareMode == "2") { // initial share or share new version
				if (this.repository.type == "p8" || this.repository.type == "cm") {
					// Get the client id of the Box repository used for sharing.
					var clientId = ecm.model.desktop.shareRepositoryOAuthId;

					var boxFileId = "";
					var priorShareDocId = "";
					if (data.shareMode == "2") {
						// Get the box file id for the existing version
						var shareRecord = this._getShareCollaborationRecord();
						boxFileId = shareRecord.attributes.boxFileId;
						if (this.repository.type == "p8") {
							priorShareDocId = shareRecord.attributes.itemId;
						}
						clientId = shareRecord.attributes.boxClientId;
					}

					var _self = this;
					var request = ecm.model.Request.invokeService("setShareStatus", this.repository.type, {
						desktop: ecm.model.desktop.id,
						repositoryId: this.repository.id,
						docid: this.id,
						shareStatusUpdateType: "update",
						shareMode: data.shareMode,
						value: null,
						boxClientId: clientId,
					}, function(response) {
						if (response.shareRecord) {
							var updatedShareRecord = BoxCollaborationRecord.createFromJSON(response.shareRecord, BoxCollaborationRecord.prototype.COLLABORATION_TYPE.SHARE, _self, null);
							var found = false;
							if (_self.boxShareRecords == null) {
								_self.boxShareRecords = new Array();
							}
							for (var i = 0; i < _self.boxShareRecords.length; i++) {
								var currentShareRecord = _self.boxShareRecords[i];
								if (currentShareRecord.attributes.boxClientId == updatedShareRecord.attributes.boxClientId) {
									found = true;
									_self.boxShareRecords[i] = updatedShareRecord;
								}
							}
							if (found == false) {
								_self.boxShareRecords.push(updatedShareRecord);
							}
							_self._shareStatus = null;
							if (_self.repository.type == "cm") {
								_self.locked = true;
								if (response.checkedOutBy) {
									_self.lockedUser = response.checkedOutBy;
								}
							}
							_self.onChange([
								_self
							]);
							_self._shareDocument(data, callback, boxFileId, priorShareDocId, clientId);
						}
					}, false, false);
				} else if (this.repository.type == "box") {
					// Don't set status for Box.
					this._shareDocument(data, callback);
				}
			} else if (data.shareMode == "1") { // reshare
				this._reshareDocument(data, callback);
			}

			this.logExit("share");
		},

		_reshareDocument: function(data, callback) {
			this.logEntry("_reshareDocument");

			var shareRecord = this._getShareCollaborationRecord();
			if (shareRecord == null) {
				if (callback) {
					callback();
				}
				return;
			}

			var request = ecm.model.Request.invokeService("reShare", null, {
				desktopId: ecm.model.desktop.id,
				repositoryType: this.repository.type,
				docid: shareRecord.attributes.boxFileId,
				password: data.password,
				canDownload: data.allowDownload,
				expirationDate: data.expireDate,
				mimetype: this.mimetype,
				senderName: this.repository.userDisplayName || this.repository.userId || data.myEmail,
				senderEmail: data.myEmail,
				recepientEmails: this._getRecipientEmails(data),
				emailComment: data.comment,
				changedPassword: data.changedPassword
			}, lang.hitch(this, function(response) {
				if (callback) {
					callback();
				}
			}), false, false);

			this.logExit("_reshareDocument");
		},

		_shareDocument: function(data, callback, boxFileId, priorShareDocId, boxClientId) {
			this.logEntry("_shareDocument");

			var schedule = new AsyncTaskSchedule({
				isRecurring: false,
				mode: "0", //Single. This means the task will only run once
				name: this.name,
				description: "Copies a document to Box for sharing.",
				userId: this.repository.userId,
				emailAddress: "",
			});

			var ltpa = cookie("LtpaToken2");
			ltpa = (ltpa && ltpa.length > 0) ? ltpa : cookie("LtpaToken");

			var recipientEmails = this._getRecipientEmails(data);
			var itemIds = [];
			itemIds.push(this.id);

			var params = {
				useSSO: false,
				sourceItemIds: itemIds,
				desktopId: ecm.model.desktop.id,
				sourceRepositoryId: this.repository.id,
				sourceRepositoryType: this.repository.type,
				destinationRepositoryType: "box",
				connectonErrorMsg: "failed to connect",
				applicationName: "navigator",
//				developerToken: "iRd9biAkJzJUY79zRLXdB0i8KQ7lyUv6",
				ltpaToken: ltpa,
				shareRecipientEmails: recipientEmails.join(";"),
				sharerEmail: data.myEmail,
				expireDate: data.expireDate,
				allowDownload: data.allowDownload,
				sharePassword: data.password,
				changedSharePassword: data.changedPassword,
				shareEmailComment: data.comment,
				shareMode: data.shareMode,
				sharingUserName: this.repository.userDisplayName || this.repository.userId || data.myEmail,
				copyMode: "1",
				itemType: "0",
				priorVersionFileId: boxFileId,
				priorVersionDocId: priorShareDocId,
				sharingUserId: this.repository.userId,
				sharingUserDisplayName: this.repository.userDisplayName,
				destinationFolderIds: data.destinationFolderId,
				shareAccessLevel: data.shareAccessLevel,
				boxClientId: boxClientId
			};

			var _self = this;
			var errorback = function() {
				// If an error occured invoking task manager, remove the pending share status on the document.
				var request = ecm.model.Request.invokeService("setShareStatus", _self.repository.type, {
					desktop: ecm.model.desktop.id,
					repositoryId: _self.repository.id,
					docid: _self.id,
					shareStatusUpdateType: "delete",
					shareMode: data.shareMode,
					value: null,
					boxClientId: boxClientId,
				}, function(response) {
					if (response) {
						_self._deleteShareRecord();
						_self._shareStatus = null;
						if (_self.repository.type == "cm") {
							_self.locked = false;
						}
						_self.onChange([
							_self
						]);
					}
				});
			}

			var categorization = "Navigator";
			ecm.model.desktop.taskManager.scheduleAsyncTask(schedule, "com.ibm.ecm.icntasks.copy.CopyToFolderTask", params, null, callback, categorization, errorback);

			this.logExit("_shareDocument");
		},

		_getRecipientEmails: function(data) {
			var recipientEmails = [];
			if (data) {
				if (data.shareWith) {
					if (data.shareWith instanceof String) {
						recipientEmails.push(data.shareWith);
					} else if (lang.isArray(data.shareWith)) {
						for ( var i in data.shareWith) {
							var email = data.shareWith[i];
							if (!email)
								continue;

							if (email instanceof String)
								recipientEmails.push(email);
							else if (email.id)
								recipientEmails.push(email.id);
						}
					} else if (data.shareWith.id) {
						recipientEmails.push(data.shareWith.id);
					}
				}
				if (!recipientEmails.length)
					recipientEmails.push(data.myEmail);
			}

			return recipientEmails;
		},

		/**
		 * Returns a ContentItem.SHARE_STATUS enum value giving the share status of the document.
		 * 
		 * @since 2.0.3.6
		 */
		getShareStatus: function() {
			if (this._shareStatus == null) {

				var shareStatus = ContentItem.SHARE_STATUS.NOT_SHARED;

				var shareRecord = this._getShareCollaborationRecord();
				if (shareRecord != null) {

					if (this.repository.type == "p8") {

						// For P8, check the id of the collaboration record. An id other than the id of this content item
						// means a different version of the document is shared.
						if (this._isShareRecordForThis(shareRecord)) {
							if (shareRecord.attributes.boxFileId == null) {
								shareStatus = ContentItem.SHARE_STATUS.PENDING_SHARE;
							} else {
								shareStatus = ContentItem.SHARE_STATUS.SHARED;
							}
						} else {
							if (shareRecord.attributes.boxFileId == null) {
								shareStatus = ContentItem.SHARE_STATUS.VERSION_PENDING_SHARE;
							} else {
								shareStatus = ContentItem.SHARE_STATUS.VERSION_SHARED;
							}
						}
					} else if (this.repository.type == "cm") {
						// This status will be correct for folder browse and current version search results.
						// For version history and all version search results, additional checking will be required.
						if (shareRecord.attributes.boxFileId == null) {
							shareStatus = ContentItem.SHARE_STATUS.PENDING_SHARE;
						} else {
							shareStatus = ContentItem.SHARE_STATUS.SHARED;
						}
					}
				}
				this._shareStatus = shareStatus;
			}
			return this._shareStatus;
		},

		/**
		 * Retrieves the box collaboration record for a document.
		 * 
		 * @private
		 * @since 2.0.3.6
		 */
		_getShareCollaborationRecord: function() {
			var shareCollaborationRecord = null;

			if (this.boxShareRecords != null && ecm.model.desktop.shareEnabled && ecm.model.desktop.shareRepositoryId && ecm.model.desktop.shareRepositoryOAuthId) {
				var exit = false;
				for (var i = 0; i < this.boxShareRecords.length && !exit; i++) {
					var shareRecord = this.boxShareRecords[i];
					if (shareRecord.attributes.collaborationType == "share"){
						if (shareRecord.attributes.boxClientId == ecm.model.desktop.shareRepositoryOAuthId) {
							if (this._isShareRecordForThis(shareRecord)) {
								shareCollaborationRecord = shareRecord;
								exit = true;
							} else {
								shareCollaborationRecord = shareRecord;
							}
						}
						else{
							// If the share record didn't match the configured share repository, check for other Box repositories in the desktop. Necessary to
							// match share records created in releases prior to converting to server tokens.
							for (var j = 0; j < ecm.model.desktop.repositories.length && !exit; j++){
								var repository = ecm.model.desktop.repositories[j];
								if (repository._isBox() && repository.oAuthEnabled && !repository.serverTokenEnabled){
									if (shareRecord.attributes.boxClientId == repository.oAuthClientId){
										if (this._isShareRecordForThis(shareRecord)) {
											shareCollaborationRecord = shareRecord;
											exit = true;
										} else {
											shareCollaborationRecord = shareRecord;
										}
									}
								}
							}
						}
					}
				}
			}

			return shareCollaborationRecord;
		},

		/**
		 * Returns a boolean indicating whether a share record is for this document.
		 * 
		 * @private
		 * @since 2.0.3.6
		 */
		_isShareRecordForThis: function(shareRecord) {
			var isEqual = false;

			if (this.repository.type == "p8") {
				// The first part (class) of the share record id may not be correct (it is always "Document").
				// For P8, compare the other two parts.
				var shareRecordIdParts = shareRecord.attributes.itemId.split(",");
				var thisIdParts = this.id.split(",");
				if (shareRecordIdParts[1] == thisIdParts[1] && shareRecordIdParts[2] == thisIdParts[2]) {
					isEqual = true;
				}
			} else if (this.repository.type == "cm") {
				isEqual = shareRecord.attributes.itemId == this.id;
			}

			return isEqual;
		},

		getVersionNumber: function() {
			var versionNumber = "";
			if (this.repository && this.repository.type == "p8") {
				versionNumber = (this.attributes.majorVersionNumber || "0") + this._getVersionNumberSeparator() + (this.attributes.MinorVersionNumber || "0");
				versionNumber = versionNumber == ("0" + this._getVersionNumberSeparator() + "0") ? "" : versionNumber;
			} else if (this.repository && this.repository.type == "cm") {
				versionNumber = this.attributes.icn_sys_version;
			} else if (this.repository && this.repository.type == "cmis") {
				versionNumber = this.attributes["cmis:versionLabel"];
			}

			if (!versionNumber && this.resultSet && this.resultSet.contentElementParent) {
				return this.resultSet.contentElementParent.getVersionNumber();
			}

			return versionNumber;
		},

		_getVersionNumberSeparator: function() {
			return ".";
		}
	});

	/**
	 * Static function that registers a factory for sub-classes of <code>ContentItem</code>.
	 * 
	 * @param factory
	 *            A factory object with <code>createFromJSON()</code> method to possibly create a sub-class of
	 *            <code>ContentItem</code> from JSON. The factory method should return null when the given JSON is not
	 *            one for known sub-classes, giving chances for other factories to create one or falling back to the
	 *            default <code>ContentItem</code> construction.
	 * @memberof ecm.model.ContentItem
	 */
	ContentItem.registerFactory = function(factory) {
		if (!ContentItem._factories) {
			ContentItem._factories = [];
		}
		ContentItem._factories.push(factory);
	};

	/**
	 * @private Constructs a content item given a JSON representation of the item.
	 * @param itemJSON
	 *            The JSON representation of the content item.
	 * @param repository
	 *            An instance of {@link ecm.model.Repository} for the item.
	 * @param resultSet
	 *            An instance of {@link ecm.model.ResultSet} if this item is from a result set.
	 * @param parent
	 *            An instance of {@link ecm.model.ContentItem} for the parent of this item (if known).
	 */
	ContentItem.createFromJSON = function(itemJSON, repository, resultSet, parent) {
		var item = null;

		// visit factories to see if one of them can create a sub-class from this JSON
		ContentItem._factories && dojo_array.some(ContentItem._factories, function(factory) {
			if (factory && factory.createFromJSON) {
				item = factory.createFromJSON(itemJSON, repository, resultSet, parent);
			}
			return !!item;
		});

		if (!item) {
			item = new ContentItem(itemJSON);
		}

		var attributes = {};
		var attributeTypes = {};
		var attributeFormats = {};
		var attributeDisplayValues = {};
		var attributeReadOnly = {};
		var attributeItems = {};
		var attributeUserInfo = {};
		var attributeValueTimeZoneOffsets = {};
		var attributeSystemProperty = {};

		for ( var i in itemJSON.attributes) {
			var attr = itemJSON.attributes[i];
			attributes[i] = attr[0];
			if (attr.length > 1) {
				attributeTypes[i] = attr[1];
			}
			if (attr.length > 2 && attr[2] != null) {
				attributeFormats[i] = attr[2];
			}
			if (attr.length > 3 && attr[3] != null) {
				attributeDisplayValues[i] = attr[3];
			}
			attributeReadOnly[i] = (attr.length > 4 && attr[4] === true);
			if (attr.length > 5 && attr[5] != null && attr[5].rows) {
				attributeItems[i] = ecm.model.ContentItem.createFromJSON(attr[5].rows[0], this.repository, null);
			}
			if (attr.length > 6 && attr[6] != null && attr[6].userInfo) {
				attributeUserInfo[i] = attr[6].userInfo;
			}
			if (attr.length > 6 && attr[6] != null && (attr[6].valueTimeZoneOffset || attr[6].valueTimeZoneOffset === 0)) {
				attributeValueTimeZoneOffsets[i] = attr[6].valueTimeZoneOffset;
			}
			if (attr.length > 6 && attr[6] != null && attr[6].isSystem) {
				attributeSystemProperty[i] = attr[6].isSystem;
			}
		}

		lang.mixin(item, {
			repository: repository,
			resultSet: resultSet,
			parent: parent,
			attributes: attributes,
			attributeTypes: attributeTypes,
			attributeFormats: attributeFormats,
			attributeDisplayValues: attributeDisplayValues,
			attributeReadOnly: attributeReadOnly,
			attributeItems: attributeItems,
			attributeUserInfo: attributeUserInfo,
			attributeValueTimeZoneOffsets: attributeValueTimeZoneOffsets,
			attributeSystemProperty: attributeSystemProperty
		});

		if (itemJSON.boxShareRecords instanceof Array) {
			item.boxShareRecords = dojo_array.map(itemJSON.boxShareRecords, lang.hitch(this, function(datum) {
				var record = BoxCollaborationRecord.createFromJSON(datum, BoxCollaborationRecord.prototype.COLLABORATION_TYPE.SHARE, item, null);
				var contentItemId = item ? item.id : null;
				var itemId = record.getValue("itemId");
				if (!!itemId && itemId != contentItemId) {
					record.contentItem = new ContentItem({
						id: itemId,
						vsId: item ? item.vsId : null,
						repository: item ? item.repository : null,
						template: item ? item.template : null
					});
				}

				return record;
			}));
		}

		return item;
	};

	ContentItem.P8_VERSION_STATUS = {
		RELEASED: "1",
		IN_PROCESS: "2",
		RESERVED: "3",
		SUPERSEDED: "4"
	};

	ContentItem.SHARE_STATUS = {
		NOT_SHARED: "1",
		PENDING_SHARE: "2",
		SHARED: "3",
		VERSION_SHARED: "4",
		VERSION_PENDING_SHARE: "5"
	};

	ContentItem.NoContentMimeTypes = {
		"": true,
		"folder": true,
		"item": true, // Currently used by CM - may be replaced with ""
		"application/x-filenet-external": true,
		"application/x-box-web-link": true,
		"application/x-searchtemplate": true,
		"application/x-searchtemplate.automatic": true,
		"application/x-unifiedsearchtemplate": true
	};

	ContentItem.NotViewableMimeClasses = {
		"ftNoContent": true,
		"ftExternalFile": true,
		"ftDocumentEntryTemplate": true,
		"ftFolderEntryTemplate": true,
		"ftIcnDocumentEntryTemplate": true,
		"ftIcnFolderEntryTemplate": true,
		"ftEntryTemplate": true,
		"ftCustomObjectEntryTemplate": true,
		"ftFormTemplate": true,
		"ftFormData": true,
		"ftDeclareRecordEntryTemplate": true,
		"ftWorkflow": true,
		"ftPolicyDocument": true,
		"ftPolicyWorkflow": true,
		"ftSearchTemplate": true,
		"ftSearchStored": true,
		"ftUnifiedSearch": true
	};

	ContentItem.SystemItemMimeTypes = {
		"application/x-filenet-searchtemplate": true,
		"application/x-searchtemplate.automatic": true,
		"application/x-unifiedsearchtemplate": true,
		"application/x-filenet-entrytemplate": true,
		"application/x-filenet-formdataentrytemplate": true,
		"application/x-filenet-customobjectentrytemplate": true,
		"application/x-filenet-documententrytemplate": true,
		"application/x-filenet-folderentrytemplate": true,
		"application/x-icn-documententrytemplate": true,
		"application/x-icn-folderentrytemplate": true,
		"application/x-filenet-declarerecordentrytemplate": true,
		"application/x-icn-declarerecordentrytemplate": true,
		"application/x-filenet-search": true,
//		"application/x-filenet-workflowdefinition": true,
//		"application/x-filenet-xpdlworkflowdefinition": true,
		"application/x-filenet-workflowpolicy": true
	};

	return ContentItem;
});
