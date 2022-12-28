sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("sample.SVM.controller.View1", {
		onInit: function () {
			//initialize SVM for SVMTable
			this.oTable = this.getView().byId("svmTable");

			this._oTableSmartVariantManagement = this.getView().byId("smartVariantManagement");

			this._oP13nButton = this.getView().byId("p13nTableSettings");

			this.oi18nResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

			this.oTable.initializeSVM(this._oTableSmartVariantManagement, this._oP13nButton, this.oi18nResourceBundle, this.getView());
		}
	});
});