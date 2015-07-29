/* this function is called after the HTML is loaded into the viewer DIV */
i2b2.ExportSQL.Init = function(loadedDiv) {
    // register DIV as valid DragDrop target for Query Master (QM) objects
    var divName = 'ExportSQL-QMDROP';
    // register for drag drop events for the following data types: QM, (QI?)
    var op_trgt = {dropTarget:true};
    i2b2.sdx.Master.AttachType(divName, 'QM', op_trgt);	
    // route event callbacks to a single drop event handler used by this plugin
    var eventRouterFunc = (function(sdxData) { i2b2.ExportSQL.doDrop(sdxData); });
    i2b2.sdx.Master.setHandlerCustom(divName, 'QM', 'DropHandler', eventRouterFunc);

    // manage YUI tabs
    var cfgObj = {activeIndex : 0};
    this.yuiTabs = new YAHOO.widget.TabView('ExportSQL-TABS', cfgObj);
    this.yuiTabs.on('activeTabChange', function(ev) { 
	//Tabs have changed 
	if (ev.newValue.get('id')=='ExportSQL-TAB1') {
	    // user switched to Results tab
	    if (i2b2.ExportSQL.model.currentRec) { 
		// gather statistics only if we have data
		if (i2b2.ExportSQL.model.dirtyResultsData) {
		    // recalculate the results only if the input data has changed
		    i2b2.ExportSQL.getResults();
		}
	    }
	}
    });
};

/* this function is called before the plugin is unloaded by the framework */
i2b2.ExportSQL.Unload = function() {
    return true;
};

i2b2.ExportSQL.doDrop = function(sdxData) {
    sdxData = sdxData[0];	// only interested in first record
    // save the info to our local data model
    i2b2.ExportSQL.model.currentRec = sdxData;
    // let the user know that the drop was successful by displaying the name of the object
    $("ExportSQL-QMDROP").innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);
    // optimization to prevent requerying the hive for new results if the input dataset has not changed
    i2b2.ExportSQL.model.dirtyResultsData = true;		
}

/* Refresh the display with info of the SDX record that was DragDropped */
i2b2.ExportSQL.getResults = function() {
    if (!i2b2.ExportSQL.model.dirtyResultsData) {
	return;
    }
    var statement  = i2b2.ExportSQL.getStatementObj();
    var dropRecord = i2b2.ExportSQL.model.currentRec;
    var qm_id      = dropRecord.sdxInfo.sdxKeyValue;
    var sdxDisplay = $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-InfoSDX")[0];		
    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-directions")[0].hide();
    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-invalidQuery")[0].hide();
    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-hlevelError")[0].hide();
    
    // callback processor
    var scopedCallback = new i2b2_scopedCallback();
    scopedCallback.scope = this;
    
    scopedCallback.callback = function(results) {
	var cl_queryMasterId = qm_id;
	i2b2.CRC.view.QT.queryRequest = results.msgRequest;

	var queryMasterName = i2b2.h.getXNodeVal(results.refXML,'name');
	
	// did we get a valid query definition back? 
	var queryDef = i2b2.h.XPath(results.refXML, 'descendant::query_name/..');
	if (queryDef.length == 0) {
	    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-invalidQuery")[0].show();
	    return;
	}

	var statement    = i2b2.ExportSQL.getStatementObj();
	var timing       = i2b2.h.getXNodeVal(queryDef[0],'query_timing');
	var specificity  = i2b2.h.getXNodeVal(queryDef[0],'specificity_scale');
	var panels       = i2b2.h.XPath(queryDef[0], 'descendant::panel');

	// extract the data for each panel
	for (var pnr = 0; pnr < panels.length; pnr++) {
	    var exclude         = (i2b2.h.getXNodeVal(panels[pnr], 'invert') == 1);
	    var panelTiming     = i2b2.h.getXNodeVal(panels[pnr], 'panel_timing') || 'ANY';
	    var panelOccurences = i2b2.h.getXNodeVal(panels[pnr], 'total_item_occurrences');
	    var panelAccuracy   = i2b2.h.getXNodeVal(panels[pnr], 'panel_accuracy_scale');					
	    var panelInvert     = i2b2.h.getXNodeVal(panels[pnr], 'invert');
	    var panelDateFrom   = i2b2.ExportSQL.extractDate(i2b2.h.getXNodeVal(panels[pnr], 'panel_date_from'));
	    var panelDateTo     = i2b2.ExportSQL.extractDate(i2b2.h.getXNodeVal(panels[pnr], 'panel_date_to'));
	    var panelItems      = i2b2.h.XPath(panels[pnr], 'descendant::item[item_key]');

	    statement.addItemGroup(exclude, panelTiming, panelOccurences, panelAccuracy, panelInvert, panelDateFrom, panelDateTo);

	    for (var itemNum = 0; itemNum < panelItems.length; itemNum++) {
		var hlevel     = i2b2.h.getXNodeVal(panelItems[itemNum], 'hlevel');
		var item_key    = i2b2.h.getXNodeVal(panelItems[itemNum], 'item_key');
		var constraint = i2b2.h.XPath(panelItems[itemNum], 'descendant::constrain_by_value');
		var operator, value, type;

		if (!item_key.includes('SA')) {
		    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-invalidQuery")[0].show();
		    return;
		}

		if (constraint != null) {
		    operator = i2b2.h.getXNodeVal(constraint[0], 'value_operator');
		    value    = i2b2.h.getXNodeVal(constraint[0], 'value_constraint');
		    type     = i2b2.h.getXNodeVal(constraint[0], 'value_type');
		}
		statement.addItem(item_key, operator, value);
	    }
	}
	var itemsString = statement.toString(); // for test purpose
	
	// i2b2.CRC.view.QT.queryResponse = results.msgResponse;
	// // switch to status tab
	// i2b2.CRC.view.status.showDisplay();
	
	// i2b2.CRC.ctrlr.QT.doQueryClear();
	
	// var dObj = {};
	// dObj.name = i2b2.h.getXNodeVal(results.refXML,'name');
	// $('queryName').innerHTML = dObj.name;
	// dObj.timing = i2b2.h.getXNodeVal(qd[0],'query_timing');
	
	// i2b2.CRC.view.QT.queryTimingButtonset('label', dObj.timing);
	// i2b2.CRC.view.QT.setQueryTiming(dObj.timing);
	// dObj.specificity = i2b2.h.getXNodeVal(qd[0],'specificity_scale');
	// dObj.panels = [];
	// var qp = i2b2.h.XPath(qd[0], 'descendant::panel');
	// var total_panels = qp.length;
	
	// for (var i1=0; i1<total_panels; i1++) {
	//     // extract the data for each panel
	//     var po = {};
	//     po.panel_num = i2b2.h.getXNodeVal(qp[i1],'panel_number');
	//     var t = i2b2.h.getXNodeVal(qp[i1],'invert');
	//     po.exclude = (t=="1");
	//     // po.timing = i2b2.h.getXNodeVal(qp[i1],'panel_timing');
	//     // 1.4 queries don't have panel_timing, and undefined doesn't work
        //     // so default to ANY
        //     po.timing = i2b2.h.getXNodeVal(qp[i1],'panel_timing') || 'ANY';				
	//     i2b2.CRC.view.QT.setPanelTiming(po.panel_num, po.timing);
	//     var t = i2b2.h.getXNodeVal(qp[i1],'total_item_occurrences');
	//     po.occurs = (1*t)-1;
	//     var t = i2b2.h.getXNodeVal(qp[i1],'panel_accuracy_scale');
	//     po.relevance = t;					
	//     var t = i2b2.h.getXNodeVal(qp[i1],'panel_date_from');
	//     if (t) {
	//     	t = t.replace('Z','');
	//     	t = t.split('-');
	//     	po.dateFrom = {};
	//     	po.dateFrom.Year = t[0];
	//     	po.dateFrom.Month = t[1];
	//     	po.dateFrom.Day = t[2];
	//     } else {
	//     	po.dateFrom = false;
	//     }
	//     var t = i2b2.h.getXNodeVal(qp[i1],'panel_date_to');
	//     if (t) {
	//     	t = t.replace('Z','');
	//     	t = t.split('-');
	//     	po.dateTo = {};
	//     	po.dateTo.Year = t[0];
	//     	po.dateTo.Month = t[1];
	//     	po.dateTo.Day = t[2];
	//     } else {
	//     	po.dateTo = false;
	//     }
	//     po.items = [];
	//     var pi = i2b2.h.XPath(qp[i1], 'descendant::item[item_key]');

	// ---------------------------
	// for (i2=0; i2<pi.length; i2++) {
	// 	var item = {};
	// 	// get the item's details from the ONT Cell
	// 	var ckey = i2b2.h.getXNodeVal(pi[i2],'item_key');
	
	
	// 	// Determine what item this is
	// 	if (ckey.startsWith("query_master_id")) {
	// 	    var o = new Object;
	// 	    o.name =i2b2.h.getXNodeVal(pi[i2],'item_name');
	// 	    o.id = ckey.substring(16);
	// 	    o.result_instance_id = o.PRS_id ;

	// 	    var sdxDataNode = i2b2.sdx.Master.EncapsulateData('QM',o);
	// 	    po.items.push(sdxDataNode);								
	// 	} else 	if (ckey.startsWith("masterid")) {
	// 	    var o = new Object;
	// 	    o.name =i2b2.h.getXNodeVal(pi[i2],'item_name');
	// 	    o.id = ckey;
	// 	    o.result_instance_id = o.PRS_id ;

	// 	    var sdxDataNode = i2b2.sdx.Master.EncapsulateData('QM',o);
	// 	    po.items.push(sdxDataNode);								
	// 	} else if (ckey.startsWith("patient_set_coll_id")) {
	// 	    var o = new Object;
	// 	    o.titleCRC =i2b2.h.getXNodeVal(pi[i2],'item_name');
	// 	    o.PRS_id = ckey.substring(20);
	// 	    o.result_instance_id = o.PRS_id ;

	// 	    var sdxDataNode = i2b2.sdx.Master.EncapsulateData('PRS',o);
	// 	    po.items.push(sdxDataNode);		
	// 	} else if (ckey.startsWith("patient_set_enc_id")) {
	// 	    var o = new Object;
	// 	    o.titleCRC =i2b2.h.getXNodeVal(pi[i2],'item_name');
	// 	    o.PRS_id = ckey.substring(19);
	// 	    o.result_instance_id = o.PRS_id ;

	// 	    var sdxDataNode = i2b2.sdx.Master.EncapsulateData('ENS',o);
	// 	    po.items.push(sdxDataNode);		
	
	// 	} else {
	// 	    //Get the modfier if it exists
	// 	    //		if (i2b2.h.getXNodeVal(pi[i2],'constrain_by_modifier') != null)
	// 	    //		{
	// 	    //			po.modifier_key = i2b2.h.getXNodeVal(pi[i2],'constrain_by_modifier/modifier_key');
	// 	    //			po.applied_path = i2b2.h.getXNodeVal(pi[i2],'constrain_by_modifier/applied_path');
	// 	    //		}
	
	
	// 	    // WE MUST QUERY THE ONT CELL TO BE ABLE TO DISPLAY THE TREE STRUCTURE CORRECTLY

	// 	    var o = new Object;
	// 	    o.level = i2b2.h.getXNodeVal(pi[i2],'hlevel');
	// 	    o.name = i2b2.h.getXNodeVal(pi[i2],'item_name');
	// 	    o.key = i2b2.h.getXNodeVal(pi[i2],'item_key');
	// 	    o.synonym_cd = i2b2.h.getXNodeVal(pi[i2],'item_is_synonym');
	// 	    o.tooltip = i2b2.h.getXNodeVal(pi[i2],'tooltip');
	// 	    o.hasChildren = i2b2.h.getXNodeVal(pi[i2],'item_icon');
	
	// 	    //o.xmlOrig = c;
	
	// 	    // Lab Values processing
	// 	    var lvd = i2b2.h.XPath(pi[i2], 'descendant::constrain_by_value');
	// 	    if ((lvd.length>0) && (i2b2.h.XPath(pi[i2], 'descendant::constrain_by_modifier').length == 0)){
	// 		lvd = lvd[0];
	// 		// pull the LabValue definition for concept
	// 		// extract & translate
	// 		var t = i2b2.h.getXNodeVal(lvd,"value_constraint");
	// 		o.LabValues = {};
	// 		o.LabValues.NumericOp = i2b2.h.getXNodeVal(lvd,"value_operator");
	// 		o.LabValues.GeneralValueType = i2b2.h.getXNodeVal(lvd,"value_type");								
	// 		switch(o.LabValues.GeneralValueType) {
	// 		case "NUMBER":
	// 		    o.LabValues.MatchBy = "VALUE";
	// 		    if (t.indexOf(' and ')!=-1) {
	// 			// extract high and low values
	// 			t = t.split(' and ');
	// 			o.LabValues.ValueLow = t[0];
	// 			o.LabValues.ValueHigh = t[1];
	// 		    } else {
	// 			o.LabValues.Value = t;
	// 		    }
	// 		    break;
	// 		case "STRING":
	// 		    o.LabValues.MatchBy = "VALUE";
	// 		    o.LabValues.ValueString = t;
	// 		    break;
	// 		case "LARGETEXT":
	// 		    o.LabValues.MatchBy = "VALUE";
	// 		    o.LabValues.GeneralValueType = "LARGESTRING";
	// 		    o.LabValues.DbOp = (i2b2.h.getXNodeVal(lvd,"value_operator") == "CONTAINS[database]" ? true : false );													
	// 		    o.LabValues.ValueString = t;
	// 		    break;
	// 		case "TEXT":	// this means Enum?
	// 		    o.LabValues.MatchBy = "VALUE";
	// 		    try {
	// 			o.LabValues.ValueEnum = eval("(Array"+t+")");
	// 			o.LabValues.GeneralValueType = "ENUM";																									
	// 		    } catch(e) {
	// 			//is a string
	// 			o.LabValues.StringOp = i2b2.h.getXNodeVal(lvd,"value_operator");
	// 			o.LabValues.ValueString = t;
	// 			o.LabValues.GeneralValueType = "STRING";	
	// 			//i2b2.h.LoadingMask.hide();
	// 			//("Conversion Failed: Lab Value data = "+t);
	// 		    }
	// 		    break;
	// 		case "FLAG":
	// 		    o.LabValues.MatchBy = "FLAG";
	// 		    o.LabValues.ValueFlag = t
	// 		    break;		
	// 		default:
	// 		    o.LabValues.Value = t;
	// 		}		
	// 	    }
	// 	    // sdx encapsulate
	// 	    var sdxDataNode = i2b2.sdx.Master.EncapsulateData('CONCPT',o);
	// 	    if (o.LabValues) {
	// 		// We do want 2 copies of the Lab Values: one is original from server while the other one is for user manipulation
	// 		sdxDataNode.LabValues = o.LabValues;
	// 	    }
	// 	    //o.xmlOrig = c;
	// 	    if (i2b2.h.XPath(pi[i2], 'descendant::constrain_by_modifier').length > 0) {
	// 		//if (i2b2.h.getXNodeVal(pi[i2],'constrain_by_modifier') != null) {
	// 		sdxDataNode.origData.parent = {};
	// 		sdxDataNode.origData.parent.key = o.key;
	// 		//sdxDataNode.origData.parent.LabValues = o.LabValues;
	// 		sdxDataNode.origData.parent.hasChildren = o.hasChildren;
	// 		sdxDataNode.origData.parent.level = o.level;
	// 		sdxDataNode.origData.parent.name = o.name;
	// 		sdxDataNode.origData.key = i2b2.h.getXNodeVal(pi[i2],'constrain_by_modifier/modifier_key');
	// 		sdxDataNode.origData.applied_path = i2b2.h.getXNodeVal(pi[i2],'constrain_by_modifier/applied_path');
	// 		sdxDataNode.origData.name = i2b2.h.getXNodeVal(pi[i2],'constrain_by_modifier/modifier_name');
	// 		sdxDataNode.origData.isModifier = true;
	// 		this.hasModifier = true;
	
	// 		// Lab Values processing
	// 		var lvd = i2b2.h.XPath(pi[i2], 'descendant::constrain_by_modifier/constrain_by_value');
	// 		if (lvd.length>0){
	// 		    lvd = lvd[0];
	// 		    // pull the LabValue definition for concept

	// 		    // extract & translate
	// 		    var t = i2b2.h.getXNodeVal(lvd,"value_constraint");
	// 		    o.ModValues = {};
	// 		    o.ModValues.NumericOp = i2b2.h.getXNodeVal(lvd,"value_operator");
	// 		    o.ModValues.GeneralValueType = i2b2.h.getXNodeVal(lvd,"value_type");								
	// 		    switch(o.ModValues.GeneralValueType) {
	// 		    case "NUMBER":
	// 			o.ModValues.MatchBy = "VALUE";
	// 			if (t.indexOf(' and ')!=-1) {
	// 			    // extract high and low values
	// 			    t = t.split(' and ');
	// 			    o.ModValues.ValueLow = t[0];
	// 			    o.ModValues.ValueHigh = t[1];
	// 			} else {
	// 			    o.ModValues.Value = t;
	// 			}
	// 			break;
	// 		    case "STRING":
	// 			o.ModValues.MatchBy = "VALUE";
	// 			o.ModValues.ValueString = t;
	// 			break;
	// 		    case "LARGETEXT":
	// 			o.ModValues.MatchBy = "VALUE";
	// 			o.ModValues.GeneralValueType = "LARGESTRING";
	// 			o.ModValues.DbOp = (i2b2.h.getXNodeVal(lvd,"value_operator") == "CONTAINS[database]" ? true : false );													
	// 			o.ModValues.ValueString = t;
	// 			break;
	// 		    case "TEXT":	// this means Enum?
	// 			o.ModValues.MatchBy = "VALUE";
	// 			try {
	// 			    o.ModValues.ValueEnum = eval("(Array"+t+")");
	// 			    o.ModValues.GeneralValueType = "ENUM";													
	// 			} catch(e) {
	// 			    o.ModValues.StringOp = i2b2.h.getXNodeVal(lvd,"value_operator");
	// 			    o.ModValues.ValueString = t;
	
	// 			    //	i2b2.h.LoadingMask.hide();
	// 			    //	console.error("Conversion Failed: Lab Value data = "+t);
	// 			}
	// 			break;
	// 		    case "FLAG":
	// 			o.ModValues.MatchBy = "FLAG";
	// 			o.ModValues.ValueFlag = t
	// 			break;		
	// 		    default:
	// 			o.ModValues.Value = t;
	// 		    }		
	// 		}
	// 		// sdx encapsulate
	// 		//var sdxDataNode = i2b2.sdx.Master.EncapsulateData('CONCPT',o);
	// 		if (o.ModValues) {
	// 		    // We do want 2 copies of the Lab Values: one is original from server while the other one is for user manipulation
	// 		    sdxDataNode.ModValues = o.ModValues;
	// 		}
	// 		//}	
	// 	    }
	// 	    po.items.push(sdxDataNode);
	// 	    //	} else {
	// 	    //		console.error("CRC's ONT Handler could not get term details about '"+ckey+"'!");
	// 	    //	}
	// 	}
	//     }
	//     dObj.panels[po.panel_num] = po;
	// }
	// hide the loading mask
	i2b2.h.LoadingMask.hide();
	
	// Element.select(sdxDisplay, '.queryMasterName')[0].innerHTML  = queryMasterName;
	// Element.select(sdxDisplay, '.sdxType')[0].innerHTML          = dropRecord.sdxInfo.sdxType;
	// Element.select(sdxDisplay, '.sdxControlCell')[0].innerHTML   = dropRecord.sdxInfo.sdxControlCell;
	// Element.select(sdxDisplay, '.queryMasterId')[0].innerHTML    = dropRecord.sdxInfo.sdxKeyValue;
	// Element.select(sdxDisplay, '.queryTiming')[0].innerHTML      = timing;
	// Element.select(sdxDisplay, '.specificityScale')[0].innerHTML = specificity;
	Element.select(sdxDisplay, '.sql')[0].innerHTML = itemsString;
	Element.select(sdxDisplay, '.msgResponse')[0].innerHTML 
	    = '<pre>' + i2b2.h.Escape(results.msgResponse) + '</pre>';
	$$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-finished")[0].show();
    }

    var msg_vals = { qm_key_value: qm_id };
    i2b2.CRC.ajax.getRequestXml_fromQueryMasterId("Plugin:ExportSQL", msg_vals, scopedCallback);
    
    i2b2.ExportSQL.model.dirtyResultsData = false;		
}

/**
 * transforms a string to an array containing year, month and day
 *
 * @param {string} string - containing date and time
 *
 * @return {Object} date
 * @return {Object} date.Year
 * @return {Object} date.Month
 * @return {Object} date.Day
 */
i2b2.ExportSQL.extractDate = function(string) {
    var date = {};
    if (string) {
	string = string.replace('Z','');
	string = string.split('-');

	date.Year  = string[0];
	date.Month = string[1];
	date.Day   = string[2];
	
	return date;
    } else {
	return false;
    }
}

/**
 * handles the processing and transformation to a SQL statement
 */
i2b2.ExportSQL.getStatementObj = function() {
    var statement = {
 	itemGroups: [],
	
 	/**
	 * returns generated SQL statement
	 *
	 * @return {string} SQL statement
	 */
 	toString: function() {
 	    var from = [];
	    var where = [];

	    for (var i = 0; i < this.itemGroups.length; i++) {
		from = from.concat(this.itemGroups[i].getTables());
		where.push(this.itemGroups[i].toString());
	    }

	    return 'SELECT *<br />'
 		+ 'FROM ' + this.tableArrayToString(from) + '<br />'
 		+ 'WHERE ' + where.join('<br /> AND ');
 	},

	/**
	 * transformes an array of table expressions to a string
	 * joins are realised as FULL (OUTER) JOIN
	 *
	 * @param {Object} array - array of table expressions
	 *
	 * @return {string} SQL
	 */
	tableArrayToString: function(array) {
	    var sql = '';
	    var prevTable;

	    for (var i = 0; i < array.length; i++) {
		if (prevTable) {
		    var prevSatzart    = String(prevTable).replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
		    var curSatzart     = String(array[i]).replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
		    var joinConstraint = '';

		    if (prevSatzart == curSatzart) {
			joinConstraint = ' USING (' + curSatzart + '_PSID)';
		    } else {
			joinConstraint = ' ON (' + prevSatzart + '_PSID = ' + curSatzart + '_PSID)';
		    }

		    sql += ' FULL JOIN ' + array[i] + joinConstraint;
		} else {
		    sql += array[i];
		}

		prevTable = array[i];
	    }

	    return sql;
	},

 	/**
	 * adds an item to the currently newest item group
	 * 
	 * @param {string} item_key - i2b2 path
	 * @param {string} operator - i2b2 database operator
	 * @param {string} value - value the item is matched to
	 */
 	addItem: function(item_key, operator, value) {
 	    var dimdiColumn = this.extractDimdiColumn(item_key);

	    if (!dimdiColumn) return;

 	    this.getLatestItemGroup().addItem(dimdiColumn, operator, value);
 	},

	/**
	 * returns the itemGroup of itemGroups array with the highest index
	 *
	 * @return {Object} itemGroup
	 */ 
	getLatestItemGroup: function() {
	    if (this.itemGroups.length == 0)
		return null;
	    return this.itemGroups[this.itemGroups.length - 1];
	},

 	/**
	 * extracts the column name from the given i2b2 path
	 *
	 * @param {string} item_key - i2b2 path
	 *
	 * @return {string} dimdiColumn
	 */
 	extractDimdiColumn: function(item_key) {
 	    var dimdiColumn = item_key.replace(/(.*\\)(SA.*?)(\\.*)/, '$2');

 	    return dimdiColumn;
 	},

 	/**
	 * adds a table expression to tables array, if not already added 
	 *
	 * @param {string} table - table expression 
	 */
 	addTable: function(table) {
 	    if (this.tables.indexOf(table) < 0)
 		this.tables.push(table);
 	},

 	/**
	 * starts a new item group with specified constraints
	 *
	 * @param {string} exclude - 
	 * @param {string} timing - 
	 * @param {integer} occurences - 
	 * @param {integer} accuracy - 
	 * @param {Object} dateFrom - start date for observation
	 * @param {Object} dateTo - end date for obserfation
	 */
 	addItemGroup: function(exclude, timing, occurences, accuracy, invert, dateFrom, dateTo) {
 	    var itemGroup = {
 	     	exclude   : exclude,
		timing    : timing,
		occurences: occurences,
		accuracy  : accuracy,
		invert    : invert,
		dateFrom  : dateFrom,
		dateTo    : dateTo,
 	     	items     : [],
		tables    : [],
		alias     : '', // ####### nutzen, um referenzierungen zwischen äußerer und innerer query zu ermöglichen  ########

		/**
		 * transforms the itemGroup to SQL syntax
		 *
		 * @return {string} SQL string
		 */
		toString: function() {
 	    	    var constraints = [];

 	    	    for (var i = 0; i < this.items.length; i++) {
 	    		constraints.push(this.items[i].toString());
 	    	    }

 	    	    return (invert == 1 ? 'NOT ' : '') 
			+ '(' + constraints.join(' OR ') + ')';
 	    	},

		/**
		 * @return {Object} tables array
		 */
		getTables: function() {
		    return this.tables;
		},

		/**
		 * generates dimdi db table names, for a given column name
		 * if there are multiple years selected for the itemGroup, 
		 * the table name gets generated for each year (connected by UNION ALL)
		 * 
		 * @param {string} dimdiColumn - valid dimdi database column name
		 * @return {string} table 
		 */
		getTablesForColumn: function(dimdiColumn) {
		    var table = '';

		    if (!this.dateFrom 
			|| (this.dateFrom && this.dateTo 
			    && this.dateFrom.Year > this.dateTo.Year)
		       ) { // missing or invalid from-date
			table = this.extractTableWithTablespace(dimdiColumn);
		    } else if (this.dateFrom 
			       && (!this.dateTo || this.dateFrom == this.dateTo)
			      ) { // missing or equal to-date
			table = this.extractTableWithTablespace(dimdiColumn, this.dateFrom.Year);
		    } else { // from- and to-date given
			var alias = '';

			for (var i = this.dateFrom.Year; i <= this.dateTo.Year; i++) {
		    	    table += 'SELECT * FROM ' + this.extractTableWithTablespace(dimdiColumn, i);
			    alias += this.extractTable(dimdiColumn, i);
			    if (i < this.dateTo.Year) {
				table += ' UNION ALL ';
				alias += '_';
			    }
			    alert(alias);
			}
			table = '(' + table + ') ' + alias;
		    }

		    return table;
		},

		/**
		 * adds a dimdi table constraint, generated by getTablesForColumn()
		 * to the groups tables array
		 *
		 * @param {string} dimdiColumn - valid dimdi database column name
		 */
		addTablesForColumn: function(dimdiColumn) {
		    var table = this.getTablesForColumn(dimdiColumn);

		    if (this.tables.indexOf(table) < 0)
			this.tables.push(table);
		},

		/**
		 * returns the dimdi db table and tablespace, which contains the given dimdi column and year
		 *
		 * @param {string} dimdiColumn - valid column name of the dimdi database
		 * @param {integer} year - Ausgleichsjahr (optional)
		 *
		 * @return {string} table name with tablespace
		 */
 		extractTableWithTablespace: function(dimdiColumn, year) {
 		    return '[TABLESPACE].' + this.extractTable(dimdiColumn, year);
 		},

		/**
		 * returns the dimdi db table, which contains the given dimdi column and year
		 *
		 * @param {string} dimdiColumn - valid column name of the dimdi database
		 * @param {integer} year - Ausgleichsjahr (optional)
		 *
		 * @return {string} table name
		 */
		extractTable: function(dimdiColumn, year) {
		    var satzart = dimdiColumn.replace(/(SA\d\d\d)(.*)/, '$1');
		    if (!year) year = '[AUSGLEICHSJAHR]';
 
		    return 'V' + year + satzart;
		},

		/** 
		 * adds a new item to the items array
		 *
		 * @param {string} dimdiColumn - dimdi database conform column name
		 * @param {string} operator - the operator used by i2b2 to query the i2b2 database
		 * @param {string} value - the value the item is matched to
		 */
 	    	addItem: function(dimdiColumn, operator, value) {
 	    	    var table = this.getTablesForColumn(dimdiColumn);

		    var item = {
 	    		dimdiColumn: dimdiColumn,
 	    		operator   : operator,
 	    		value      : value,
			table      : table,
			occurences : this.occurences,

			/**
			 * @return {string} dimdiColumn 
			 */
 	    		getDimdiColumn: function() {
 	    		    return this.dimdiColumn;
 	    		},

			/**
			 * transforms the item to SQL
			 *
			 * @return {string} SQL string build from dimdiColumn, operator and value
			 */
 	    		toString: function() {
			    var sql        = '';
			    var constraint = '';
			    var satzart    = this.dimdiColumn.replace(/(SA\d\d\d)(.*)/, '$1');

			    if (this.operator) {
 	    			constraint = this.dimdiColumn + ' ' 
				    + this.getModifiedOperator() + ' '
				    + this.getModifiedValue();
			    } else {
				constraint = this.dimdiColumn + ' IS NOT NULL';
			    }

			    if (this.occurences > 1) {
				var alias = 'alias'; // mit äußerer query synchronisieren

				sql = this.occurences + ' <= '
				    + '(SELECT count(*)'
				    + ' FROM ' + table
				    + ' WHERE ' + constraint
				    + '       AND SA' + satzart + '_PSID2 = ' + alias + '.' + satzart + '_PSID2'
				    + ')';
			    } else {
				sql = constraint;
			    }

			    return sql;
 	    		},

			/** 
			 * returns the operator translatet to SQL syntax
			 *
			 * @return {string} operator in SQL syntax
			 */
			getModifiedOperator: function() {
			    var operator  = this.operator.replace(/\[.*\]/, '');
			    var sqlMapper = {
				'LT'  : '<'
				, 'LE': '<='
				, 'EQ': '='
				, 'GT': '>'
				, 'GE': '>='
			    };

			    if (sqlMapper[operator])
				return sqlMapper[operator];
			    return operator;
			},

			/** 
			 * returns the value of the item
			 * the value is modified, depending on the datatype and operation
			 *
			 * @return {string} modified value
			 */ 
			getModifiedValue: function() {
			    var operator_sufix = this.operator.replace(/(.*?\[)(.*?)(\])/, '$2');
			    var value          = this.value;

			    switch (this.getDatatype()) {
			    case 'string':
				if (operator_sufix == 'contains')
				    value = '%' + value + '%';
				if (operator_sufix == 'begin')
				    value += '%';
				if (operator_sufix == 'end')
				    value = '%' + value;
				// in case of 'exact': no additions needed 
				
				return value.includes("'") ? value : "'" + value + "'";
			    case 'integer':
				return this.value.replace(/'/g, '');
			    default:
				return 'no valid datatype for ' + this.dimdiColumn + ' found!';
			    }
			},

			/**
			 * returns 'string' or 'integer' depending on the given dimdi db column name 
			 *
			 * @param {string} 'string' or 'integer'
			 */
			getDatatype: function() {
			    var satzartNr = this.dimdiColumn.replace(/(SA)(\d\d\d)(.*)/, '$2');

			    if ((satzartNr == 551 || satzartNr == 651)
				&& (new RegExp('DIAGNOSE|ICD|QUALIFIZIERUNG')).test(this.dimdiColumn)
			       )
				return 'string';

			    return 'integer';
			}
 	    	    };

		    this.items.push(item);
		    this.addTablesForColumn(dimdiColumn);
 	    	}
 	    };

 	    this.itemGroups.push(itemGroup);
 	}
    }

    return statement;
}
