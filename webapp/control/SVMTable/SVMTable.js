sap.ui.define([
	"sap/m/Table",
	"sap/ui/model/json/JSONModel",
	"sap/ui/comp/smartvariants/PersonalizableInfo",
	"sap/ui/core/Fragment"
], function (Table, JSONModel, PersonalizableInfo, Fragment) {
	"use strict";
	/**
	 * @class SVMTable
	 * @classdesc
	 * Standard sap.m.Table with *built-in* sap.ui.comp.smartvariants.SmartVariantManagement
	 * @augments sap.m.Table
	 */
	var SVMTable = Table.extend("sample.SVM.control.SVMTable.SVMTable", {
		renderer: function (oRm, oControl) {
			Table.getMetadata().getRenderer().render(oRm, oControl);
		},

		metadata: {
			properties: {
				/**
				 * Key used to access personalization data.
				 */
				persistencyKey: {
					type: "string",
					group: "Misc",
					defaultValue: ""
				}
			}
		}
	});
	/**
	 * @memberOf SVMTable
	 * @public
	 * @description Initalizes the smartvariantmanagement. 
	 * @param {sap.ui.comp.smartvariants.SmartVariantManagement} oSVM - SmartVariantManagement
	 * @param {sap.m.Button} oP13nButton - Button to display P13nSettings
	 * @param {sap.base.i18n.ResourceBundle} oi18nResourceBundle - i18nBundle for column translations
	 * @param {sap.ui.core.mvc.XMLView} oView - view for accessing local ids
	 */
	SVMTable.prototype.initializeSVM = function (oSVM, oP13nButton, oi18nResourceBundle, oView) {
		this._oi18nResourceBundle = oi18nResourceBundle;
		this._oParentView = (oView) ? oView : this._determineParentView(this);
		//P13nButton
		this.oP13nButton = oP13nButton;
		this._oP13nModel = new JSONModel(this._generateP13nModelData());
		this._sP13nUndo = JSON.stringify(this._oP13nModel.getData()); //For standard variant
		this.oP13nButton.attachPress(this._onPersonalization.bind(this));

		//Initialize Smart Variant Management
		this.oSVM = oSVM;
		var oTablePersInfo = new PersonalizableInfo({
			keyName: this.getPersistencyKey(),
			type: "table"
		});
		oTablePersInfo.setControl(this);
		this.oSVM.addPersonalizableControl(oTablePersInfo);

		this.oSVM.initialise(function () {
			this.oSVM.currentVariantSetModified(false);
		}.bind(this), this);

	};

	/**
	 * @memberOf SVMTable
	 * @private
	 * @description generate P13nSettings data based on the table
	 * @returns {object} oP13nModelData - Data for P13nSettingsModel
	 */
	SVMTable.prototype._generateP13nModelData = function () {
		var aColumns = this.getColumns();
		var oP13nModelData = {
			items: [],
			columnItems: [],
			showResetEnabled: false
		};
		aColumns.forEach(function (oColumn, iIndex) {
			oP13nModelData.items.push({
				columnKey: this._oParentView.getLocalId(oColumn.getId()),
				text: this._oi18nResourceBundle.getText(oColumn.getAggregation("header").getBindingPath("text"))
			});
			oP13nModelData.columnItems.push({
				columnKey: this._oParentView.getLocalId(oColumn.getId()),
				visible: true,
				index: iIndex
			});

		}.bind(this));
		return oP13nModelData;
	};

	/**
	 * @memberOf SVMTable
	 * @private
	 * @description open P13nDialog and create beforeOpenUndoObject
	 */
	SVMTable.prototype._onPersonalization = function () {
		if (!this._pPersonalizationDialog) {
			this._pPersonalizationDialog = Fragment.load({
				name: "sample.SVM.control.SVMTable.PersonalizationDialog",
				controller: this
			}).then(function (oPersonalizationDialog) {
				oPersonalizationDialog.setModel(this._oP13nModel);
				return oPersonalizationDialog;
			}.bind(this));
		}

		this._pPersonalizationDialog.then(function (oPersonalizationDialog) {
			this._sP13nBeforeOpen = JSON.stringify(this._oP13nModel.getData());
			oPersonalizationDialog.open();
		}.bind(this));
	};

	/**
	 * @memberOf SVMTable
	 * @private
	 * @description applys local temporary P13nSetting to Table and set variant modified flag if needed
	 */
	SVMTable.prototype._onP13nOK = function () {
		var oP13nModelData = this._oP13nModel.getData();
		var bResetEnabled = oP13nModelData.showResetEnabled;
		oP13nModelData.showResetEnabled = false; //change so comparision works

		this._pPersonalizationDialog.then(function (oPersonalizationDialog) {
			if (JSON.stringify(oP13nModelData) !== this._sP13nUndo) {
				this.oSVM.currentVariantSetModified(true);
			} else {
				this.oSVM.currentVariantSetModified(false);
			}
			oP13nModelData.showResetEnabled = bResetEnabled;
			this._applyP13nToTable(oP13nModelData);
			this._oP13nModel.refresh(true); //so items in P13nDialog reorder 
			oPersonalizationDialog.close();
		}.bind(this));
	};

	/**
	 * @memberOf SVMTable
	 * @private
	 * @description Reset P13nSettings changes after opening via sP13nBeforeOpen and close P13nDialog
	 */
	SVMTable.prototype._onP13nCancel = function () {
		this._pPersonalizationDialog.then(function (oPersonalizationDialog) {
			this._oP13nModel.setData(JSON.parse(this._sP13nBeforeOpen));
			oPersonalizationDialog.close();
		}.bind(this));
	};

	/**
	 * @memberOf SVMTable
	 * @private
	 * @description Reset local temporary P13nSettings
	 */
	SVMTable.prototype._onP13nReset = function () {
		this._oP13nModel.setData(JSON.parse(this._sP13nUndo));
	};

	/**
	 * @memberOf SVMTable
	 * @private
	 * @description changeColumnsItems Event Handler of P13nDialog. Check if settings changed
	 */
	SVMTable.prototype._onP13nChangeColumnItems = function () {
		var oP13nModelData = this._oP13nModel.getData();
		oP13nModelData.showResetEnabled = false;
		if (JSON.stringify(oP13nModelData) !== this._sP13nUndo) {
			this._oP13nModel.setProperty("/showResetEnabled", true);
		} else {
			this._oP13nModel.setProperty("/showResetEnabled", false);
		}

	};

	/**
	 * @memberOf SVMTable
	 * @private
	 * @description rearange and set the visiblity of the tablecolumns according to P13nSettings
	 * @param {object} JSON object - oP13nSettings
	 */
	SVMTable.prototype._applyP13nToTable = function (oP13nModelData) {
		var aTableColumns = this.getColumns();
		var aP13nColumns = oP13nModelData.columnItems;

		aP13nColumns.forEach(function (oP13nColumn) {
			var aTableColumn = aTableColumns.filter(function (oTableColumn) {
				return this._oParentView.getLocalId(oTableColumn.getId()) === oP13nColumn.columnKey;
			}.bind(this));

			if (aTableColumn.length > 0) {
				aTableColumn[0].setVisible(oP13nColumn.visible);
				aTableColumn[0].setOrder(oP13nColumn.index);
			}
		}.bind(this));

		this.invalidate();
	};

	/**
	 * @memberOf SVMTable
	 * @public
	 * @description Creates and returns the variant representation - send to system
	 * @returns {object} JSON object - P13nSettings
	 */
	SVMTable.prototype.fetchVariant = function () {
		return {
			columnItems: this._oP13nModel.getProperty("/columnItems")
		};
	};

	/**
	 * @memberOf SVMTable
	 * @public
	 * @description applying the variant data and create undo object - retrieve from system
	 * @param {object} oVariant the data blob representing part of the variant content
	 * @returns {object} data to be stored as part of the variant content
	 */
	SVMTable.prototype.applyVariant = function (oVariant) {
		this._oP13nModel.setProperty("/columnItems", oVariant.columnItems)
		this._sP13nUndo = JSON.stringify(this._oP13nModel.getData());
		this._applyP13nToTable(this._oP13nModel.getData());
		return null;
	};
	/**
	 * @memberOf SVMTable
	 * @private
	 * @description Determine parentview via recursive function
	 * @param {sample.SVM.control.SVMTable.SVMTable} oSVMTable
	 * @return {sap.ui.core.mvc.XMLView} oView
	 */
	SVMTable.prototype._determineParentView = function (oParent) {
		if (oParent.getMetadata().getName() === "sap.ui.core.mvc.XMLView") {
			return oParent;
		} else {
			return this._determineParentView(oParent.getParent());
		}
	};

	return SVMTable;
});