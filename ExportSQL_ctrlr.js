/* this function is called after the HTML is loaded into the viewer DIV */
i2b2.ExportSQL.Init = function(loadedDiv) {
    var qmDivName      = 'ExportSQL-QMDROP';
    var conceptDivName = 'ExportSQL-IDROP';
    var op_trgt        = { dropTarget: true };
    var startYear      = 2009;
    var endYear        = new Date().getFullYear();
    var yearOptions    = '<option>---</option>';

    for (var year = startYear; year <= endYear; year++) {
	yearOptions += '<option>' + year + '</option>';
    }
    document.getElementById('fromYear').innerHTML = yearOptions;
    document.getElementById('toYear').innerHTML = yearOptions;

    i2b2.ExportSQL.model.concepts = [];
    i2b2.sdx.Master.AttachType(qmDivName, 'QM', op_trgt);
    i2b2.sdx.Master.AttachType(conceptDivName, 'CONCPT', op_trgt);

    i2b2.sdx.Master.setHandlerCustom(qmDivName, 'QM', 'DropHandler', function(sdxData) { i2b2.ExportSQL.doDrop(sdxData); });
    i2b2.sdx.Master.setHandlerCustom(conceptDivName, 'CONCPT', 'DropHandler', function(sdxData) { i2b2.ExportSQL.doDropConcept(sdxData); });

    var cfgObj = { activeIndex : 0 };
    this.yuiTabs = new YAHOO.widget.TabView('ExportSQL-TABS', cfgObj);
};

/* this function is called before the plugin is unloaded by the framework */
i2b2.ExportSQL.Unload = function() {
    return true;
};

i2b2.ExportSQL.doDrop = function(sdxData) {
    sdxData = sdxData[0];
    i2b2.ExportSQL.model.currentRec = sdxData;

    $('ExportSQL-QMDROP').innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);

    i2b2.ExportSQL.model.dirtyResultsData = true;		
}

i2b2.ExportSQL.doDropConcept = function(sdxData) {
    sdxData = sdxData[0];
    sdxData.sdxInfo.sdxKeyValue = sdxData.sdxInfo.sdxKeyValue.replace(/(.*?)(SA\d\d\d.*?)(\\.*)/, '$2');
    if (!sdxData.sdxInfo.sdxKeyValue.match(/SA\d\d\d/)) 
	return;

    i2b2.ExportSQL.model.concepts.push(sdxData);
    i2b2.ExportSQL.model.concepts = i2b2.ExportSQL.uniqueElements(i2b2.ExportSQL.model.concepts);
    i2b2.ExportSQL.redrawConceptDiv();
    i2b2.ExportSQL.model.dirtyResultsData = true;
}

i2b2.ExportSQL.redrawConceptDiv = function() {
    $('ExportSQL-IDROP').innerHTML = i2b2.ExportSQL.model.concepts.map(
	function(x) { return x.sdxInfo.sdxDisplayName + ' - ' + x.sdxInfo.sdxKeyValue; }
    ).join('<br>');
}

/* Refresh the display with info of the SDX record that was DragDropped */
i2b2.ExportSQL.getResults = function() {
    if (!i2b2.ExportSQL.model.dirtyResultsData) {
	return;
    }
    var dropRecord = i2b2.ExportSQL.model.currentRec;
    var qm_id      = dropRecord.sdxInfo.sdxKeyValue;
    var sdxDisplay = $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-InfoSDX")[0];
    var result     = i2b2.ExportSQL.processQM(qm_id);

    var tempTables = i2b2.ExportSQL.uniqueElements(result[0].match(/temp_group_g\d+ /g));

    result[0] += '<br><br>' + i2b2.ExportSQL.processItems(tempTables);

    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-directions")[0].hide();
    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-invalidQuery")[0].hide();
    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-hlevelError")[0].hide();
    
    Element.select(sdxDisplay, '.sql')[0].innerHTML 
	= '<pre>' + result[0] + '</pre>';
    Element.select(sdxDisplay, '.msgResponse')[0].innerHTML 
	= '<pre>' + i2b2.h.Escape(result[1]) + '</pre>';
    $$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-finished")[0].show();

    i2b2.ExportSQL.model.dirtyResultsData = false;
}

/**
 *
 */
i2b2.ExportSQL.uniqueElements = function(array) {
    var result = [];

    for (var i = 0; i < array.length; i++) {
	if (result.indexOf(array[i]) == -1)
	    result.push(array[i]);
    }

    return result;
}

i2b2.ExportSQL.processQM = function(qm_id, outerPanelNumber, outerExclude) {
    var msg_vals = { qm_key_value: qm_id };
    var results  = i2b2.CRC.ajax.getRequestXml_fromQueryMasterId('Plugin:ExportSQL', msg_vals);
    var queryMasterName = i2b2.h.getXNodeVal(results.refXML,'name');
    
    var tablespace = '[TABLESPACE]';

    // did we get a valid query definition back? 
    var queryDef = i2b2.h.XPath(results.refXML, 'descendant::query_name/..');
    if (queryDef.length == 0) {
	$$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-invalidQuery")[0].show();
	return;
    }

    var statement   = i2b2.ExportSQL.getStatementObj();
    var timing      = i2b2.h.getXNodeVal(queryDef[0],'query_timing');
    var specificity = i2b2.h.getXNodeVal(queryDef[0],'specificity_scale');
    var panels      = i2b2.h.XPath(queryDef[0], 'descendant::panel');
    var sql         = '';
    var resultSql   = '<br><br>CREATE TEMPORARY TABLE ' + tablespace + '.temp_result' 
	+ (outerPanelNumber ? '_' + outerPanelNumber : '') + ' AS (<br>';

    // extract the data for each panel
    for (var pnr = 0; pnr < panels.length; pnr++) {
	var panelNumber     = 'g' + i2b2.h.getXNodeVal(panels[pnr], 'panel_number');
	var panelExclude    = i2b2.h.getXNodeVal(panels[pnr], 'invert');
	var panelTiming     = i2b2.h.getXNodeVal(panels[pnr], 'panel_timing') || 'ANY';
	var panelOccurences = i2b2.h.getXNodeVal(panels[pnr], 'total_item_occurrences');
	var panelAccuracy   = i2b2.h.getXNodeVal(panels[pnr], 'panel_accuracy_scale');					
	var panelDateFrom   = i2b2.ExportSQL.extractDate(i2b2.h.getXNodeVal(panels[pnr], 'panel_date_from'));
	var panelDateTo     = i2b2.ExportSQL.extractDate(i2b2.h.getXNodeVal(panels[pnr], 'panel_date_to'));
	var panelItems      = i2b2.h.XPath(panels[pnr], 'descendant::item[item_key]');
	var subQueryCounter = 1;
	var subQueryTempTables = [];

	if (outerPanelNumber)
	    panelNumber = outerPanelNumber + '_' + panelNumber;
	if (outerExclude == 1 && panelExclude == 1)
	    panelExclude = 0;

	statement.addItemGroup(
	    panelNumber, panelExclude, panelTiming, panelOccurences, 
	    panelAccuracy, panelDateFrom, panelDateTo
	);

	for (var itemNum = 0; itemNum < panelItems.length; itemNum++) {
	    var hlevel     = i2b2.h.getXNodeVal(panelItems[itemNum], 'hlevel');
	    var item_key   = i2b2.h.getXNodeVal(panelItems[itemNum], 'item_key');
	    var item_icon  = i2b2.h.getXNodeVal(panelItems[itemNum], 'item_icon');
	    var constraint = i2b2.h.XPath(panelItems[itemNum], 'descendant::constrain_by_value');
	    var operator, value, type;

	    if (!(item_key.includes('SA') || item_key.includes('masterid:'))) {
		$$('DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-invalidQuery')[0].show();
		return;
	    }

	    if (constraint != null) {
		operator = i2b2.h.getXNodeVal(constraint[0], 'value_operator');
		value    = i2b2.h.getXNodeVal(constraint[0], 'value_constraint');
		type     = i2b2.h.getXNodeVal(constraint[0], 'value_type');
	    }

	    if (item_key.includes('masterid:')) {
		var masterid = item_key.replace('masterid:', '');
		var subQuery = i2b2.ExportSQL.processQM(
		    masterid
		    , panelNumber + '_q' + subQueryCounter
		    , panelExclude
		);

		// subQueryTempTables = subQueryTempTables.concat(
		    // subQuery[0].match(/temp_result_g[gq0-9_]*/)
		// );

		subQueryTempTables.push(tablespace + '.temp_result_' + panelNumber + '_q' + subQueryCounter);

		subQueryCounter++;
		sql += subQuery[0];

		continue;
	    }

	    statement.addItem(item_key, item_icon, operator, value);
	}

	if (subQueryTempTables.length > 0) {
	    subQueryTempTables = i2b2.ExportSQL.uniqueElements(subQueryTempTables);
	    
	    resultSql += '(SELECT psid FROM ' + tablespace + '.temp_group_' + panelNumber + '<br>UNION<br>'
		+ subQueryTempTables.map(
		    function(x) { return 'SELECT psid FROM ' + x; }
		).join('<br>UNION<br>')
		+ ')';
	} else {
	    resultSql += 'SELECT psid FROM ' + tablespace + '.temp_group_' + panelNumber;
	}

	if (pnr < panels.length - 1) {
	    resultSql += '<br>INTERSECT<br>';
	}
    }
    resultSql += '<br>);<br><br>';
    sql = statement.toString2() + sql + resultSql;

    return new Array(sql, results.msgResponse); // for test purpose
}
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
	return null;
    }
}

/**
 * transformes an array of table expressions to a string
 * joins are realised as FULL (OUTER) JOIN
 *
 * @param {Object} array - array of table expressions
 *
 * @return {string} SQL
 */
i2b2.ExportSQL.tableArrayToString = function(array) {
    var sql = '';
    var prevTable;

    for (var i = 0; i < array.length; i++) {
	if (prevTable) {
	    var prevSatzart    = String(prevTable).replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
	    var curSatzart     = String(array[i]).replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
	    var joinConstraint = '';

	    if (prevSatzart == curSatzart) {
		joinConstraint = '<br>USING (' + curSatzart + '_PSID)<br>';
	    } else {
		joinConstraint = '<br>ON (' + prevSatzart + '_PSID = ' + curSatzart + '_PSID)<br>';
	    }

	    sql += '<br>FULL JOIN<br>' + array[i] + joinConstraint;
	} else {
	    sql += array[i];
	}

	prevTable = array[i];
    }
	
    return sql;
}

/**
 * creates the final SELECT statement
 *
 * @param {Object} tempTables - array of all created temporary tables
 * @param {Object} items - array of all selected items, by user
 *
 * @return {string} select statement
 */
i2b2.ExportSQL.processItems = function(tempTables) {
    var sql          = '';
    var inConstraint = i2b2.ExportSQL.generateInConstraintForTables(tempTables);
    var items        = i2b2.ExportSQL.model.concepts.map(function(x) { return x.sdxInfo.sdxKeyValue; });
    var tablespace   = '[TABLESPACE]';
    var statement    = i2b2.ExportSQL.getStatementObj();
    var fromYear     = document.getElementById('fromYear');
    var toYear       = document.getElementById('toYear');

    fromYear = fromYear.options[fromYear.selectedIndex].text;
    toYear   = toYear.options[toYear.selectedIndex].text;
    
    var fromDate = fromYear == '---' ? null : i2b2.ExportSQL.extractDate(fromYear);
    var toDate   = toYear == '---' ? null : i2b2.ExportSQL.extractDate(toYear);

    statement.addItemGroup(1, 0, 'ANY', 1, 1, fromDate, toDate);
    for (var i = 0; i < items.length; i++) {
	statement.addItem(items[i]);
    }
    
    var tables  = statement.getTablesStringLatestGroup();
    var satzart = tables.replace(/(.*?)(SA\d\d\d)(.*)/, '$2'); 
    
    sql += 'SELECT ' + items.join(', ') + '<br>'
	+ 'FROM ' + tables + '<br>'
	+ 'WHERE [CASE] ' + satzart + '_PSID2 IN(<br>SELECT psid FROM ' + tablespace + '.temp_result<br>);';
    
    return sql;
}

/**
 *
 */
i2b2.ExportSQL.generateInConstraintForTables = function(tables) {
    return tables.map(
	function(x) { return 'SELECT psid FROM [TABLESPACE].' + x; }
    ).join('<br>INTERSECT<br>');
}

/**
 * handles the processing and transformation to a SQL statement
 */
i2b2.ExportSQL.getStatementObj = function() {
    var statement = {
 	itemGroups: [],
	
 	toString: function() {
 	    var from = [];
	    var where = [];

	    for (var i = 0; i < this.itemGroups.length; i++) {
		from = from.concat(this.itemGroups[i].getTables());
		where.push(this.itemGroups[i].toString());
	    }
	    
	    return 'SELECT *<br>'
 		+ 'FROM ' + i2b2.ExportSQL.tableArrayToString(from) + '<br>'
 		+ 'WHERE ' + where.join('<br> AND ');
 	},

	/**
	 * returns generated SQL statement
	 *
	 * @return {string} SQL statement
	 */
	toString2: function() {
	    return this.itemGroups.map(
		function(x) { return x.toString2(); }
	    ).join('<br><br>');
	},
	
	getTablesStringLatestGroup: function() {
	    return i2b2.ExportSQL.tableArrayToString(
		this.getLatestItemGroup().getTables()
	    );
	},

 	/**
	 * adds an item to the currently newest item group
	 * 
	 * @param {string} item_key - i2b2 path
	 * @param {string} operator - i2b2 database operator
	 * @param {string} value - value the item is matched to
	 */
 	addItem: function(item_key, icon, operator, value) {
	    if (item_key)
 		this.getLatestItemGroup().addItem(item_key, icon, operator, value);
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
	 * @param {integer} number -
	 * @param {integer} exclude - 
	 * @param {string} timing - 
	 * @param {integer} occurences - 
	 * @param {integer} accuracy - 
	 * @param {Object} dateFrom - start date for observation
	 * @param {Object} dateTo - end date for obserfation
	 */
 	addItemGroup: function(number, exclude, timing, occurences, accuracy, dateFrom, dateTo) {
 	    var itemGroup = {
		number    : number,
 	     	exclude   : exclude,
		timing    : timing,
		occurences: occurences,
		accuracy  : accuracy,
		dateFrom  : dateFrom,
		dateTo    : dateTo,
 	     	items     : [],
		tables    : [],

		/**
		 * transforms the itemGroup to SQL syntax
		 *
		 * @return {string} SQL string
		 */
		toString: function() {
 	    	    var sql = this.items.map(
			function(x) { return x.toString(); }
		    ).join('<br>OR ');

		    if (this.exclude == 1)
			sql = 'NOT (' + sql + ')';
		    
		    return sql;
 	    	},

		toString2: function() {
		    if (this.items.length == 0)
			return 'CREATE TEMPORARY TABLE [TABLESPACE].' + this.getTempTableName() + '(psid integer);';

		    return 'CREATE TEMPORARY TABLE [TABLESPACE].' + this.getTempTableName() + ' AS (<br>'
			+ 'SELECT CASE '
			+ this.tables.map(
			    function(x) {
				var satzart = x.replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
				return satzart + '_PSID2 IS NOT NULL THEN ' + satzart + '_PSID2';
			    }
			).join(' ELSE ') + ' ELSE NULL END AS psid<br>'
			+ 'FROM ' + i2b2.ExportSQL.tableArrayToString(this.tables)
			+ '<br>WHERE ' + this.toString() 
			+ '<br>);';
		},

		/**
		 * @return {Object} tables array
		 */
		getTables: function() {
		    return this.tables;
		},

		getTempTableName: function() {
		    return 'temp_group_' + this.number;
		},

		/**
		 * generates dimdi db table names, for a given column name
		 * if there are multiple years selected for the itemGroup, 
		 * the table name gets generated for each year (connected by UNION ALL)
		 * 
		 * @param {string} dimdiColumn - valid dimdi database column name
		 * @return {Object} array with table and alias 
		 */
		getTableWithAliasForColumn: function(dimdiColumn) {
		    var table = '';
		    var alias = '';

		    if (!this.dateFrom 
			|| (this.dateFrom && this.dateTo 
			    && this.dateFrom.Year > this.dateTo.Year)
		       ) { // missing or invalid from-date 
			table = this.extractTableWithTablespace(dimdiColumn);
			alias = this.extractTable(dimdiColumn);
		    } else if (this.dateFrom 
			       && (!this.dateTo || this.dateFrom == this.dateTo)
			      ) { // missing or equal to-date
			table = this.extractTableWithTablespace(dimdiColumn, this.dateFrom.Year);
			alias = this.extractTable(dimdiColumn, this.dateFrom.Year);
		    } else { // from- and to-date given

			for (var i = this.dateFrom.Year; i <= this.dateTo.Year; i++) {
		    	    table += 'SELECT * FROM ' + this.extractTableWithTablespace(dimdiColumn, i);
			    alias += this.extractTable(dimdiColumn, i);
			    if (i < this.dateTo.Year) {
				table += ' UNION ALL ';
				alias += '_';
			    }
			}
			table = '(' + table + ')'; 
		    }
		    return new Array(table, alias);
		},

		getTableForColumn: function(dimdiColumn) {
		    return this.getTableWithAliasForColumn(dimdiColumn)[0];
		},

		getAliasForColumn: function(dimdiColumn) {
		    return this.getTableWithAliasForColumn(dimdiColumn)[1];
		},

		/**
		 * adds a dimdi table constraint, generated by getTableForColumn()
		 * to the groups tables array
		 *
		 * @param {string} dimdiColumn - valid dimdi database column name
		 */
		addTableForColumn: function(dimdiColumn) {
		    var table = this.getTableWithAliasForColumn(dimdiColumn).join(' ');

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
 	    	addItem: function(item_key, icon, operator, value) {
		    var dimdiColumn = item_key.replace(/(.*\\)(SA.*?)(\\.*)/, '$2');
 	    	    var table       = this.getTableForColumn(dimdiColumn);
		    var alias       = this.getAliasForColumn(dimdiColumn);

		    var item = {
			item_key   : item_key,
 	    		dimdiColumn: dimdiColumn,
 	    		operator   : operator,
 	    		value      : value,
			table      : table,
			alias      : alias,
			occurences : this.occurences,
			icon       : icon,
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
			    var value      = this.item_key.replace(/(.*?\\)([^\\]*?)(\\$)/, '$2');
			    var regExp     = new RegExp('(.*?' + this.dimdiColumn + '\\\\)([^\\\\]*)(\\\\.*)');
			    var catalogue  = this.item_key.replace(regExp, '$2');

			    if (this.operator) {
 	    			constraint = this.dimdiColumn + ' ' 
				    + this.getModifiedOperator() + ' '
				    + this.getModifiedValue();
			    } else if (value != catalogue) {
				constraint = this.dimdiColumn
				    + " LIKE '" + value + (this.icon.indexOf('F') != -1 ? '%' : '') + "'";
			    } else {
				constraint = this.dimdiColumn + ' IS NOT NULL';
			    }

			    if (this.occurences > 1) {
				sql = this.occurences + ' <= '
				    + '(SELECT count(*)'
				    + ' FROM ' + table
				    + ' WHERE ' + constraint
				    + '       AND ' + satzart + '_PSID2 = ' + this.alias + '.' + satzart + '_PSID2'
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
		    this.addTableForColumn(dimdiColumn);
 	    	}
 	    };
	    
 	    this.itemGroups.push(itemGroup);
 	}
    }
    
    return statement;
}


