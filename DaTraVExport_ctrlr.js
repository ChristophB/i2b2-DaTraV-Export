/* this function is called after the HTML is loaded into the viewer DIV */
i2b2.DaTraVExport.Init = function(loadedDiv) {
    var qmDivName      = 'DaTraVExport-QMDROP';
    var conceptDivName = 'DaTraVExport-IDROP';
    var op_trgt        = { dropTarget: true };
    var cfgObj         = { activeIndex: 0 };
    var endYear        = new Date().getFullYear();
    i2b2.DaTraVExport.model.minStartYear = 2008;

    var counter        = 1;
    var selectFromYear = document.getElementById('fromYear');
    var selectToYear   = document.getElementById('toYear');

    /* Rework for Firefox */
    selectFromYear.options[0] = new Option('---');
    selectToYear.options[0]   = new Option('---');

    for (var year = i2b2.DaTraVExport.model.minStartYear; year <= endYear; year++) {
	selectFromYear.options[counter] = new Option(year);
	selectToYear.options[counter]   = new Option(year);
	counter++;
    }

    i2b2.DaTraVExport.model.tablespace        = 'DATRAVEXAMPLE';
    i2b2.DaTraVExport.model.concepts          = [];
    i2b2.DaTraVExport.model.multiResultTables = false;

    i2b2.sdx.Master.AttachType(qmDivName, 'QM', op_trgt);
    i2b2.sdx.Master.AttachType(conceptDivName, 'CONCPT', op_trgt);

    i2b2.sdx.Master.setHandlerCustom(
	qmDivName, 'QM', 'DropHandler'
	, function(sdxData) { i2b2.DaTraVExport.doDrop(sdxData); }
    );
    i2b2.sdx.Master.setHandlerCustom(
	conceptDivName, 'CONCPT', 'DropHandler'
	, function(sdxData) { i2b2.DaTraVExport.doDropConcept(sdxData); }
    );

    i2b2.DaTraVExport.redrawMessagePanel();

    this.yuiTabs = new YAHOO.widget.TabView('DaTraVExport-TABS', cfgObj);
};

/* this function is called before the plugin is unloaded by the framework */
i2b2.DaTraVExport.Unload = function() {
    return true;
};

/* resets the plugins model data and redraws the view to initial stage */
i2b2.DaTraVExport.reset = function() {
    i2b2.DaTraVExport.model.concepts = [];
    i2b2.DaTraVExport.model.fromYear = undefined;
    i2b2.DaTraVExport.model.toYear   = undefined;
    i2b2.DaTraVExport.model.qm       = undefined;

    document.getElementById('fromYear').selectedIndex = 0;
    document.getElementById('toYear').selectedIndex   = 0;
    $('DaTraVExport-QMDROP').innerHTML = 'Drop a query object here';
    document.getElementById('results').hide();

    i2b2.DaTraVExport.redrawConceptDiv();
    i2b2.DaTraVExport.checkModel();
};

/**
 * this function is called after modifying a year value in the plugins view
 * the set or modifyied year gets added to the model data
 */
i2b2.DaTraVExport.setYear = function() {
    var fromYear = document.getElementById('fromYear');
    var toYear   = document.getElementById('toYear');

    fromYear = fromYear.options[fromYear.selectedIndex].text;
    toYear   = toYear.options[toYear.selectedIndex].text;

    i2b2.DaTraVExport.model.fromYear = fromYear;
    i2b2.DaTraVExport.model.toYear   = toYear;

    i2b2.DaTraVExport.checkModel();
};

/**
 * updates the models value of multiResultTables
 * if the value is true, the generated SQL-statement creates a table for each
 * required Satzart to prevent redundant data collection
 */
i2b2.DaTraVExport.setmultiResultTable = function() {
    var checked = document.getElementById('multiResultTable').checked;
    
    i2b2.DaTraVExport.model.multiResultTables = checked;
    i2b2.DaTraVExport.checkModel();
};

/* redraws the message panel depending on available values in the model data */
i2b2.DaTraVExport.redrawMessagePanel = function() {
    var message     = '';
    var qmText      = 'Drop a previous executed Query from the bottom left "Previous Queries" window.';
    var yearText    = 'Specify at least a start-year.';
    var conceptText = 'Drop some concepts (no catalogues).';
    var fromYear    = i2b2.DaTraVExport.model.fromYear;
    var toYear      = i2b2.DaTraVExport.model.toYear;
    var concepts    = i2b2.DaTraVExport.model.concepts;

    if (i2b2.DaTraVExport.model.qm)
	message += '<li>' + qmText + ' &#10004;</li>';
    else message += '<b><li>' + qmText + '</li></b>';
 
    if (!isNaN(fromYear) && (isNaN(toYear) || fromYear <= toYear))
	message += '<li>' + yearText + ' &#10004;</li>';
    else message += '<b><li>' + yearText + '</li></b>';
	
    if (concepts && concepts.length > 0)
	message += '<li>' + conceptText + ' &#10004;</li>';
    else message += '<b><li>' + conceptText + '</li></b>';

    document.getElementById('messagePanel').innerHTML = '<ol>' + message + '</ol>';
};

/**
 * handles a droped query master 
 *
 * @param {Object[]} sdxData - droped sdx object
 */
i2b2.DaTraVExport.doDrop = function(sdxData) {
    sdxData = sdxData[0];
    i2b2.DaTraVExport.model.qm = sdxData;

    $('DaTraVExport-QMDROP').innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);

    i2b2.DaTraVExport.checkModel();		
};

/* checks if the model data is valid and ready for an execution */
i2b2.DaTraVExport.checkModel = function() {
    var fromYear = i2b2.DaTraVExport.model.fromYear;
    var toYear   = i2b2.DaTraVExport.model.toYear;
    var concepts = i2b2.DaTraVExport.model.concepts;

    if (!isNaN(fromYear) && (isNaN(toYear) || fromYear <= toYear)
	&& concepts && concepts.length > 0
	&& i2b2.DaTraVExport.model.qm
       ) {
	i2b2.DaTraVExport.model.dirtyResultsData = true;
    } else i2b2.DaTraVExport.model.dirtyResultsData = false;
    
    i2b2.DaTraVExport.redrawMessagePanel();
};

/** 
 * handles droped concepts 
 * 
 * @param {Object[]} sdxData - droped sdx object
 */
i2b2.DaTraVExport.doDropConcept = function(sdxData) {
    var concept = {};
    sdxData             = sdxData[0];
    concept.dimdiColumn = sdxData.sdxInfo.sdxKeyValue.replace(/(.*?\\)(SA\d\d\d.*?)(\\$)/, '$2');
    concept.displayName = sdxData.sdxInfo.sdxDisplayName;
 
    if (!concept.dimdiColumn.match(/SA\d\d\d[^\\]*$/))
	return;
    i2b2.DaTraVExport.model.concepts.push(concept);
    
    /* check for duplicated concepts and remove them */
    var temp = [];
    for (i = 0; i < i2b2.DaTraVExport.model.concepts.length; i++) {
	if (temp.indexOf(i2b2.DaTraVExport.model.concepts[i].dimdiColumn) != -1)
	    i2b2.DaTraVExport.model.concepts.splice(i, 1);
	else temp.push(i2b2.DaTraVExport.model.concepts[i].dimdiColumn);
    }

    i2b2.DaTraVExport.redrawConceptDiv();    
    i2b2.DaTraVExport.checkModel();
};

/**
 * removes an item from the concept-div
 *
 * @param {string} dimdiColumn
 */
i2b2.DaTraVExport.removeItem = function(dimdiColumn) {
    var concepts = [];
    for (i = 0; i < i2b2.DaTraVExport.model.concepts.length; i++) {
	var concept = i2b2.DaTraVExport.model.concepts[i];
	if (concept.dimdiColumn != dimdiColumn)
	    concepts.push(concept);
    }
    i2b2.DaTraVExport.model.concepts = concepts;

    i2b2.DaTraVExport.redrawConceptDiv();
    i2b2.DaTraVExport.checkModel();
};

/**
 * the function is called if a concept is added or removed,
 * adds a clickable span for each concept
 */
i2b2.DaTraVExport.redrawConceptDiv = function() {    
    var icon      = 'sdx_ONT_CONCPT_leaf.gif'; // 'sdx_ONT_CONCPT_branch-exp.gif';
    var innerHTML = i2b2.DaTraVExport.model.concepts.map(
	function(x) {
	    return '<span class="dropedItem" onclick="i2b2.DaTraVExport.removeItem(\'' + x.dimdiColumn + '\')" title="' + x.dimdiColumn + '">'
		+ '<img src="js-i2b2/cells/ONT/assets/' + icon + '">'
		+ '&nbsp;&nbsp;' + x.displayName
		+ '</span>';
	}
    ).join('<br>');

    if (!innerHTML)
	innerHTML = 'Drop concepts here';
    $('DaTraVExport-IDROP').innerHTML = innerHTML;
};

/**
 * copies the resulting sql to clipboard
 * if an error occurs, the sql gets marked so the user can copy it manually
 */
i2b2.DaTraVExport.copyToClipboard = function() {
    var div = document.getElementById('DaTraVExport-StatementBox');

    if (typeof window.getSelection != 'undefined' && typeof document.createRange != 'undefined') {
        var range = document.createRange();
        range.selectNodeContents(div);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (typeof document.selection != 'undefined' && typeof document.body.createTextRange != 'undefined') {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(div);
        textRange.select();
    }

    try {
	if (!document.execCommand('Copy'))
	    throw 'Unable to copy to clipboard';
	i2b2.DaTraVExport.clearSelection();
    } catch (e) {
	alert('Unable to copy to clipboard. Please copy the selection manualy by pressing CTRL + C or CMD + C');
    }
};

/**
 * removes the text selection from the sql, if there is any
 */
i2b2.DaTraVExport.clearSelection = function() {
    if (document.selection) {
        document.selection.empty();
    } else if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
};

/**
 * starts the generation of the sql statement
 * and displays it on the web page
 */
i2b2.DaTraVExport.getResults = function() {
    if (!i2b2.DaTraVExport.model.dirtyResultsData) {
	return;
    }
    
    //try {
	var qm_id      = i2b2.DaTraVExport.model.qm.sdxInfo.sdxKeyValue;
	var result     = i2b2.DaTraVExport.processQM(qm_id);

	result[0] += i2b2.DaTraVExport.processItems();

	document.getElementById('DaTraVExport-StatementBox').innerHTML = 
	    '<pre>' + result[0] + '</pre>';
	document.getElementById('results').style.display = 'block';
    //} catch (e) {
    //	alert(e);
    //}

    i2b2.DaTraVExport.model.dirtyResultsData = false;
};

/**
 * returns an array which contains all elements from the given array except duplicates
 *
 * @param {Object[]} array
 *
 * @return {Object[]} array without duplicates
 */
i2b2.DaTraVExport.uniqueElements = function(array) {
    if (!array) throw 'i2b2.DaTraVExport.uniqueElements(): provided array is null';

    var temp = [];
    var result = array.slice();

    for (var i = result.length - 1; i >= 0; i--) {
	if (temp.indexOf(result[i]) != -1) 
	    result.splice(i, 1);
	else temp.push(result[i]);

    }

    return result;
};

/**
 * generates "create table" statements for a given QM-ID
 * this function is called recursively, if the specified query contains subqueries
 *
 * @param {integer} qm_id - ID of a querymaster
 * @param {string} outerPanelNumber - panelNumber of a panel, in which the query is embedded
 *
 * @return {Object[]} array with 0: generated SQL and 1: XML-message of the QM
 */
i2b2.DaTraVExport.processQM = function(qm_id, outerPanelNumber) {
    var tablespace = i2b2.DaTraVExport.model.tablespace;
    var msg_vals   = { qm_key_value: qm_id };
    var results    = i2b2.CRC.ajax.getRequestXml_fromQueryMasterId('Plugin:DaTraVExport', msg_vals);
    var queryDef   = i2b2.h.XPath(results.refXML, 'descendant::query_name/..');
    var xmlResults = [];
    var indent     = Array(5).join('&nbsp;');

    if (queryDef.length == 0) {
	throw 'processQM(): invalide query definition';
    }

    /*** Population Query ***/
    xmlResults.push(i2b2.DaTraVExport.processQMXML(queryDef[0], outerPanelNumber));


    /*** Event Queries ***/
    var events           = i2b2.h.XPath(queryDef[0], 'descendant::subquery');
    var eventConstraints = i2b2.h.XPath(queryDef[0], 'descendant::subquery_constraint');

    for (var i = 0; i < events.length; i++) {
    	xmlResults.push(i2b2.DaTraVExport.processQMXML(events[i], outerPanelNumber));
    }


    /*** Output ***/
    var sql = outerPanelNumber ? '/*** Sub Query ' + outerPanelNumber + ' ***/<br>' : '';
    var resultTableName = tablespace + '.pat' + (outerPanelNumber ? '_' + outerPanelNumber : '');
    for (var i = 0; i < xmlResults.length; i++) {
	var statement         = xmlResults[i].statement;
	var panelResultTables = xmlResults[i].panelResultTables;
	var subQuerySql       = xmlResults[i].subQuerySql;
	var eventId           = xmlResults[i].eventId;
	var createSql         = '';
	var tempSql           = '';

	/*** INTERSECT expression for WHERE constraints ***/
	var sameVisitTables = [];
	var diffVisitTables = [];
	panelResultTables = i2b2.DaTraVExport.uniqueElements(panelResultTables);

	if (eventId) { //current query is an event
	    createSql += 'SELECT psid, berichtsjahr FROM ' + panelResultTables[0];
	} else {
	    for (var j = 0; j < panelResultTables.length; j++) {
		var curResultTable = panelResultTables[j];
		if (curResultTable.match(/samevisit/))
		    sameVisitTables.push(curResultTable);
		else diffVisitTables.push(curResultTable);
	    }
	    if (sameVisitTables.length > 0) {
		createSql += '(SELECT psid, berichtsjahr FROM (' + sameVisitTables.map(
			function(x) { return 'SELECT psid, psid2, berichtsjahr FROM ' + x }
		    ).join('<br>&nbsp;INTERSECT<br>&nbsp;') + '))';
	    }
	    if (diffVisitTables.length > 0) {
		var diffVisitSql = '';

		if (diffVisitTables.length == 1) {
		    diffVisitSql += 'SELECT psid, berichtsjahr FROM ' + diffVisitTables[0];
		} else {
		    diffVisitSql += 'SELECT psid, berichtsjahr FROM ' + tablespace + '.temp_table';
		}

		if (sameVisitTables.length > 0) {
		    createSql = 'SELECT psid, berichtsjahr<br>'
			+ 'FROM (' + createSql + '<br>'
			+ Array(7).join('&nbsp;') + 'UNION<br>'
			+ Array(7).join('&nbsp;') + diffVisitSql + '<br>'
			+ Array(6).join('&nbsp;') + ')<br>'
			+ Array(6).join('&nbsp;') + 'JOIN<br>' 
			+ Array(6).join('&nbsp;') + '(SELECT psid FROM ' + createSql + ') USING (psid)<br>'
			+ Array(6).join('&nbsp;') + 'JOIN<br>'
			+ Array(6).join('&nbsp;') + '(SELECT psid FROM (' + diffVisitSql + ')) USING (psid)<br>';
		} else {
		    createSql += diffVisitSql;
		}
	    }
	}
	if (diffVisitTables.length > 1) { // keep information about Berichtsjahr
	    tempSql = 'DROP TABLE ' + tablespace + '.temp_table;<br>'
		+ 'CREATE TABLE ' + tablespace + '.temp_table AS (<br>'
		+ 'SELECT psid, berichtsjahr<br>'
		+ 'FROM (<br>' + diffVisitTables.map(
		    function(x) { return indent + 'SELECT psid, berichtsjahr FROM ' + x }
		).join('<br>' + indent + indent + 'UNION<br>') + '<br>'
		+ indent + ') q<br>'
		+ indent + 'JOIN ('
		+ diffVisitTables.map(
		    function(x) { return 'SELECT psid FROM ' + x }
		).join(') USING (psid)<br>' + indent + 'JOIN (')
		+ ') USING (psid)<br>' 
		+ ');<br><br>';
	}

	sql += '/*** ' + (eventId ? 'Event ' + eventId : 'Population') + ' ***/<br>'
	    + (subQuerySql != '' ? subQuerySql + '<br><br>' : '')
	    + statement.toSQLString() +'<br><br>'
	    + tempSql
	    + 'DROP TABLE ' + resultTableName + (eventId ? '_' + eventId : '') + ';<br>'
	    + 'CREATE TABLE ' + resultTableName + (eventId ? '_' + eventId : '') + ' AS (<br>'
	    + createSql + '<br>);<br><br>'
	    + 'DROP TABLE ' + tablespace + '.temp_table;<br><br>';
    }

    /*** Event Handling ***/
    for (var i = 0; i < eventConstraints.length; i++) {
	var firstEvent        = i2b2.h.XPath(eventConstraints[i], 'descendant::first_query')[0];
	var firstEventTable   = resultTableName + '_' + i2b2.h.getXNodeVal(firstEvent, 'query_id').replace('Event ', 'e');
	var firstAggOperator  = i2b2.h.getXNodeVal(firstEvent, 'aggregate_operator');
	var operator          = i2b2.h.getXNodeVal(eventConstraints[i], 'operator');
	var secondEvent       = i2b2.h.XPath(eventConstraints[i], 'descendant::second_query')[0];
	var secondEventTable  = resultTableName + '_' + i2b2.h.getXNodeVal(secondEvent, 'query_id').replace('Event ', 'e');
	var secondAggOperator = i2b2.h.getXNodeVal(secondEvent, 'aggregate_operator');

	switch (firstAggOperator) {
	case 'FIRST': firstAggOperator = 'MIN'; break;
	case 'LAST' : firstAggOperator = 'MAX'; break;
	default: throw 'i2b2.DaTraVExport.processQM(): invalid first aggregate operator (' + firstAggOperator + ') in event constraint';
	};

	switch (secondAggOperator) {
	case 'FIRST': secondAggOperator = 'MIN'; break;
	case 'LAST' : secondAggOperator = 'MAX'; break;
	default: throw 'i2b2.DaTraVExport.processQM(): invalid second aggregate operator (' + secondAggOperator + ') in event constraint';
	};

	switch (operator) {
	case 'LESS'        : operator = '<';  break;
	case 'LESSEQUAL'   : operator = '<='; break;
	case 'EQUAL'       : operator = '=';  break;
	case 'GREATER'     : operator = '>';  break;
	case 'GREATEREQUAL': operator = '>='; break;
	default: throw 'i2b2.DaTraVExport.processQM(): invalid operator (' + operator + ') in event constraint';
	};

	sql += '/*** ' + (i + 1) + '. Event Constraint ***/<br>'
	    + 'DELETE FROM ' + resultTableName + '<br>'
	    + 'WHERE psid NOT IN (<br>'
	    + indent + 'SELECT psid<br>'
	    + indent + 'FROM (SELECT psid, ' + firstAggOperator + '(berichtsjahr) AS value FROM ' + firstEventTable + ' GROUP BY psid) e1<br>'
	    + indent + indent + 'JOIN<br>'
	    + indent + indent + '(SELECT psid, ' + secondAggOperator + '(berichtsjahr) AS value FROM ' + secondEventTable + ' GROUP BY psid) e2<br>'
	    + indent + indent + 'USING (psid)<br>'
	    + indent + 'WHERE e1.value ' + operator + ' e2.value<br>'
	    + ');<br><br>';
    }

    return new Array(sql, results.msgResponse);
};

/**
 * constructs a result object from a given set of parameters
 *
 * @param {string} statement - sql statement
 * @param {Object[]} panelResultTables - names of the panels result tables
 * @param {string} subQuerySql - sql statement of all contained sub queries
 * @parem {string} eventId - id of the event, if the xml document contains an event (optional)
 *
 * @return {Object} result
 */
i2b2.DaTraVExport.newResultObj = function(statement, panelResultTables, subQuerySql, eventId) {
    var result = {
	statement        : statement,
	panelResultTables: panelResultTables,
	subQuerySql      : subQuerySql,
	eventId          : eventId
    };
    return result;
};

/**
 * returns an object, which stores information to results of a processed query master xml document
 *
 * @param {Object} queryDef - to process xml document
 * @param {string} outerPanelNumber - outer queries panel number, where the sub query is placed (optional)
 *
 * @return {Object} result 
 */
i2b2.DaTraVExport.processQMXML = function(queryDef, outerPanelNumber) {
    var tablespace  = i2b2.DaTraVExport.model.tablespace;
    var statement   = i2b2.DaTraVExport.newStatementObj();
    var timing      = i2b2.h.getXNodeVal(queryDef, 'query_timing');
    var specificity = i2b2.h.getXNodeVal(queryDef, 'specificity_scale');
    var panels      = i2b2.h.XPath(queryDef, 'child::panel');
    var queryType   = i2b2.h.getXNodeVal(queryDef, 'query_type');
    var subQuerySql = '';
    var panelResultTables = [];
    var eventId;

    if (queryType && queryType == 'EVENT')
	eventId = i2b2.h.getXNodeVal(queryDef, 'query_id').replace('Event ', 'e');
    
    for (var pnr = 0; pnr < panels.length; pnr++) { // iterate panels
	var panel              = panels[pnr];
	var panelNumber        = 'g' + i2b2.h.getXNodeVal(panel, 'panel_number');
	var panelExclude       = i2b2.h.getXNodeVal(panel, 'invert');
	var panelTiming        = i2b2.h.getXNodeVal(panel, 'panel_timing') || 'ANY';
	var panelOccurences    = i2b2.h.getXNodeVal(panel, 'total_item_occurrences');
	var panelAccuracy      = i2b2.h.getXNodeVal(panel, 'panel_accuracy_scale');					
	var panelDateFrom      = i2b2.DaTraVExport.extractDate(i2b2.h.getXNodeVal(panel, 'panel_date_from'));
	var panelDateTo        = i2b2.DaTraVExport.extractDate(i2b2.h.getXNodeVal(panel, 'panel_date_to'));
	var panelItems         = i2b2.h.XPath(panel, 'descendant::item[item_key]');
	var subQueryCounter    = 1;

	if (!panelDateFrom) { // from date in group is null -> use selected year values
	    panelDateFrom = i2b2.DaTraVExport.extractDate(i2b2.DaTraVExport.model.fromYear);
	    panelDateTo   = i2b2.DaTraVExport.extractDate(i2b2.DaTraVExport.model.toYear);
	    // alert('Added selected year values to a query or subquery, because it had no dates asigned.');
	}
	if (panelDateFrom.Year < i2b2.DaTraVExport.model.minStartYear
	    || (panelDateTo && panelDateTo.Year < i2b2.DaTraVExport.model.minStartYear)
	   ) {
	    throw 'processQM(): date in a query or subquery is before ' + i2b2.DaTraVExport.model.minStartYear;
	}

	if (eventId)
	    panelNumber = eventId + '_' + panelNumber;
	if (outerPanelNumber)
	    panelNumber = outerPanelNumber + '_' + panelNumber;

	statement.addItemGroup(
	    panelNumber, panelExclude, panelTiming, panelOccurences, 
	    panelAccuracy, panelDateFrom, panelDateTo
	);

	for (var itemNum = 0; itemNum < panelItems.length; itemNum++) { // iterate items
	    var item       = panelItems[itemNum];
	    var item_key   = i2b2.h.getXNodeVal(item, 'item_key');
	    var item_icon  = i2b2.h.getXNodeVal(item, 'item_icon');
	    var constraint = i2b2.h.XPath(item, 'descendant::constrain_by_value');
	    var modifier   = i2b2.h.XPath(item, 'descendant::constrain_by_modifier');
	    var operator   = undefined;
	    var value      = undefined;

	    if (!item_key.match(/SA/) && !item_key.match(/masterid:/) && !modifier)
		throw 'processQM(): the QM contains a non-supported query or subquery';

	    if (modifier[0]) {
		item_key   = i2b2.h.getXNodeVal(modifier[0], 'modifier_key');
		constraint = i2b2.h.XPath(modifier[0], 'descendant::constrain_by_value');
	    }

	    if (constraint[0]) {
		operator = i2b2.h.getXNodeVal(constraint[0], 'value_operator');
		value    = i2b2.h.getXNodeVal(constraint[0], 'value_constraint');
	    }
	    
	    /*** item is a querymaster ***/
	    if (item_key.match(/masterid:/)) {
		var masterid = item_key.replace('masterid:', '');
		subQuerySql += i2b2.DaTraVExport.processQM(
		    masterid
		    , panelNumber + '_q' + subQueryCounter
		    , panelExclude
		)[0];

		statement.addSubQueryTable(tablespace + '.pat_' + panelNumber + '_q' + subQueryCounter);
		subQueryCounter++;
		continue;
	    }
	    statement.addItem(item_key, item_icon, operator, value);
	}

	switch (panelTiming) {
	case 'SAMEINSTANCENUM':
	    var tempPanelNumber = panelNumber.replace(/\d*$/, '');
	    panelResultTables.push(tablespace + '.grp_' + tempPanelNumber + '_sameins');
	    break;
	case 'SAMEVISIT':
	    if (statement.getLatestItemGroup().getTables().length > 1 || !statement.getLatestItemGroup().getTables()[0].match(/SA999/)) {
		panelResultTables.push(tablespace + '.grp_' + panelNumber + '_samevisit');
		break;
	    }
	default:
	    panelResultTables.push(tablespace + '.grp_' + panelNumber);
	}
    }

    return i2b2.DaTraVExport.newResultObj(statement, panelResultTables, subQuerySql, eventId);
};

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
i2b2.DaTraVExport.extractDate = function(string) {
    var date = {};
    if (string && string.match(/\d/)) {
	string = string.replace('Z','');
	string = string.split('-');

	date.Year  = string[0];
	date.Month = string[1];
	date.Day   = string[2];
	
	return date;
    } else {
	return null;
    }
};

/**
 * transformes an array of table expressions to a string
 * joins are realized as FULL (OUTER) JOIN
 *
 * @param {Object} array - array of table expressions
 *
 * @return {string} SQL
 */
i2b2.DaTraVExport.tableArrayToSQLString = function(array) {
    var sql         = '';
    var prevSatzart = '';
    var satzarten   = [];
    var indent      = Array(5).join('&nbsp;');

    for (var i = 0; i < array.length; i++) {
	var curSatzart = String(array[i]).replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
	
	if (i > 0) { // not the first element of the array
	    sql += '<br>' + indent + 'FULL JOIN<br>' 
		+ indent +  array[i] + '<br>'
		+ indent + 'ON (' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2')) 
		+ ' = ' + i2b2.DaTraVExport.generateCaseString(new Array(curSatzart), new Array('PSID', 'PSID2')) 
		+ '<br>' + indent + indent + 'AND ' 
	        + (curSatzart.match(/SA999/) || (satzarten.length == 1 && satzarten[0].match(/SA999/)) ?
		   ''
		   : i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID2')) + ' = ' + curSatzart + '_PSID2'
		   + '<br>' + indent + indent + 'AND ' 
		  )
		+ i2b2.DaTraVExport.generateCaseString(satzarten, new Array('BERICHTSJAHR')) + ' = ' + curSatzart + '_BERICHTSJAHR' // workarround for SA951 + BERICHTSJAHR needed
		+ ')';
	} else { // first element
	    sql += array[i];
	}

	prevSatzart = curSatzart;
	satzarten.push(curSatzart);
    }

    if (array.length > 1) sql = '(' + sql + ')';

    return sql;
};

/**
 * generates a SQL CASE expression for a given set of Satzarten, expanded by a sufix
 * there are some exceptions for the combination SA999 + PSID2 and SA951 + BERICHTSJAHR
 *
 * @param {Object[]} satzarten - array of Satzarten
 * @param {Object[]} sufix - first element is sufix of normal column, following: columns concatenated with BERICHTSJAHR
 * @param {string} alias - alias for the CASE expression (optional)
 + @param {string} outerAlias - alias of the outer querys from-tables (optional)
 *
 * @return {string} SQL CASE expression
 */
i2b2.DaTraVExport.generateCaseString = function(satzarten, sufix, alias, outerAlias) {
    var sql        = '';
    var satzarten  = satzarten.slice();
    var outerAlias = outerAlias ? outerAlias + '.' : '';
    var alias      = alias ? ' AS ' + alias : '';

    if (!satzarten || !sufix) return '';
    if (sufix[0].match(/PSID2/) && satzarten.indexOf('SA999') != -1)
	satzarten.splice(satzarten.indexOf('SA999'), 1);
    if (sufix[0].match(/BERICHTSJAHR/) && satzarten.indexOf('SA951') != -1)
	satzarten.splice(satzarten.indexOf('SA951'), 1);
    if (satzarten.length == 1 && satzarten[0].match(/SA999/) && sufix.indexOf('PSID2') != -1)
	sufix.splice(sufix.indexOf('PSID2'), 1);
    if (satzarten.length == 1 && satzarten[0].match(/SA951/) && sufix.indexOf('BERICHTSJAHR') != -1)
	sufix.splice(sufix.indexOf('BERICHTSJAHR'), 1);
    
    if (sufix.length == 0 || satzarten.length == 0) return '';
    if (satzarten.length == 1 && sufix.length == 1)
	return outerAlias + satzarten[0] + '_' + sufix + alias;

    for (var o = 0; o < sufix.length; o++) { 
	for (var i = 0; i < satzarten.length; i++) {
	    if (sufix[o].match(/PSID2/) && satzarten[i].match(/SA999/)) continue;
	    // changed AUSGLEICHSJAHR to BERICHTSJAHR, so previously selected columns have to contain BERICHTSJAHR
	    // if (sufix[o].match(/BERICHSTJAHR/) && satzarten[i].match(/SA951/)) continue;
	    sql += ' WHEN ' + outerAlias + satzarten[i] + '_' + sufix[o] + ' IS NOT NULL THEN '
		+ (o > 0 ? outerAlias + satzarten[i] + "_BERICHTSJAHR || '_' || " : '')
		+ outerAlias + satzarten[i] + '_' + sufix[o];
	}
    }

    if (sql == '') return '';
    return 'CASE' + sql + ' ELSE NULL END' + alias;
};

/**
 * creates the final CREATE TABLE statement(s)
 *
 * @return {string} CREATE TABLE statement(s)
 */
i2b2.DaTraVExport.processItems = function() {
    if (i2b2.DaTraVExport.model.multiResultTables) {
	return i2b2.DaTraVExport.processItemsMultiResultTables();
    } else {
	return i2b2.DaTraVExport.processItemsSingleResultTable();
    }
}

/**
 * Creates one CREATE TABLE statement where multiple Satzarten are included.
 * The problem here is that a FULL JOIN is used to link all the required Satzart tables,
 * so the resulting table potentially contails m*n tuple
 *
 * @return {string} single CREATE TABLE statement
 */
i2b2.DaTraVExport.processItemsSingleResultTable = function() {
    var items              = i2b2.DaTraVExport.model.concepts.map(function(x) { return x.dimdiColumn; });
    var tablespace         = i2b2.DaTraVExport.model.tablespace;
    var statement          = i2b2.DaTraVExport.newStatementObj();
    var fromDate           = i2b2.DaTraVExport.extractDate(i2b2.DaTraVExport.model.fromYear);
    var toDate             = i2b2.DaTraVExport.extractDate(i2b2.DaTraVExport.model.toYear);

    statement.addItemGroup(1, 0, 'ANY', 1, 1, fromDate, toDate);
    
    var satzarten = [];
    for (var i = 0; i < items.length; i++) {
	statement.addItem(items[i], 'LA');
	satzarten.push(items[i].replace(/(SA\d\d\d)(.*)/, '$1'));
    }
    satzarten = i2b2.DaTraVExport.uniqueElements(satzarten);

    var ausgleichsjahrCase = i2b2.DaTraVExport.generateCaseString(satzarten, new Array('AUSGLEICHSJAHR'), 'ausgleichsjahr');
    var berichtsjahrCase   = i2b2.DaTraVExport.generateCaseString(satzarten, new Array('BERICHTSJAHR'), 'berichtsjahr');
    var psid2Case          = i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID2'), 'psid2');
    var indent             = Array(5).join('&nbsp;');
    
    return '/*** Result Table ***/<br>'
	+ 'DROP TABLE ' + tablespace + '.result;<br>'
	+ 'CREATE TABLE ' + tablespace + '.result AS (<br>'
	+ 'SELECT psid<br>' 
	+ indent + ', ' + ausgleichsjahrCase + '<br>'
	+ (berichtsjahrCase == '' ? '' : indent + ', ' + berichtsjahrCase + '<br>')
	+ (psid2Case == '' ? '' : indent + ', ' + psid2Case + '<br>')
	+ indent + ', ' + items.join('<br>' + indent + ', ') + '<br>'
	+ 'FROM ' + tablespace + '.rs<br>'
	+ indent + 'LEFT JOIN<br>'
	+ indent + statement.getTablesStringLatestGroup() + '<br>'
	+ indent + 'ON (psid = ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2')) + ')' + '<br>'
	+ ');';
};

/**
 * Creates multiple CREATE TABLE statements, depending on the selected items and there origin.
 *
 * @return {string} multiple CREATE TABLE statements, one per Satzart
 */
i2b2.DaTraVExport.processItemsMultiResultTables = function() {
    var items              = i2b2.DaTraVExport.model.concepts.map(function(x) { return x.dimdiColumn; });
    var tablespace         = i2b2.DaTraVExport.model.tablespace;
    var fromDate           = i2b2.DaTraVExport.extractDate(i2b2.DaTraVExport.model.fromYear);
    var toDate             = i2b2.DaTraVExport.extractDate(i2b2.DaTraVExport.model.toYear);
    var satzarten          = [];
    var sql                = '';
    var indent             = Array(5).join('&nbsp;');

    /*** collect required satzarten ***/
    for (var i = 0; i < items.length; i++) {
	satzarten.push(items[i].replace(/(SA\d\d\d)(.*)/, '$1'));
    }
    satzarten = i2b2.DaTraVExport.uniqueElements(satzarten);
    satzarten.sort();

    /*** process satzarten ***/
    for (var i = 0; i < satzarten.length; i++) {
	var cur_satzart = satzarten[i];
	var statement   = i2b2.DaTraVExport.newStatementObj();
	var cur_items   = items.filter(
	    function(x) { if (x.match(cur_satzart)) return x; }
	);

	statement.addItemGroup(1, 0, 'ANY', 1, 1, fromDate, toDate);
	statement.addItem(cur_items[0], 'LA');

	sql += '/*** Result table for Satzart ' + cur_satzart + ' ***/<br>'
	    + 'DROP TABLE result_' + cur_satzart + ';<br>'
	    + 'CREATE TABLE result_' + cur_satzart + ' AS (<br>'
	    + 'SELECT psid<br>'
	    + indent + ', ' + cur_satzart + '_AUSGLEICHSJAHR<br>'
	    + (!cur_satzart.match(/951/) ? indent + ', ' + cur_satzart + '_BERICHTSJAHR<br>' : '')
	    + (!cur_satzart.match(/999/) ? indent + ', ' + cur_satzart + '_PSID2<br>' : '')
	    + indent + ', ' + cur_items.join('<br>' + indent + ', ') + '<br>'
	    + 'FROM ' + tablespace + '.pat<br>'
	    + indent + 'LEFT JOIN<br>'
	    + indent + statement.getTablesStringLatestGroup() + '<br>'
	    + indent + 'ON (psid = ' + i2b2.DaTraVExport.generateCaseString(new Array(cur_satzart), new Array('PSID', 'PSID2')) + ')<br>'
	    + ');<br><br>';
    }

    return sql;
}

/**
 * converts a number into a string and adds up to two leading zeroes
 *
 * @param {string} num
 * @param {integer} size - size of the resulting string
 * 
 * @return {string} converted number
 */
i2b2.DaTraVExport.addLeadingZeros = function(num, size) {
    var string = '00' + num;
    return string.substr(string.length - size);
};

/**
 * handles the processing and transformation to a SQL statement
 */
i2b2.DaTraVExport.newStatementObj = function() {
    var statement = {
 	itemGroups: [],

	/**
	 * returns generated SQL statement
	 *
	 * @return {string} SQL statement
	 */
	toSQLString: function() {
	    var sql = [];
	    var mergedSameInstances = this.mergeSqlForItemGroupsWithSameInstanceNum();

	    if (mergedSameInstances) sql.push(mergedSameInstances);

	    for (var i = 0; i < this.itemGroups.length; i++) {
		if (this.itemGroups[i].getTiming() != 'SAMEINSTANCENUM')
		    sql.push(this.itemGroups[i].toSQLString());
	    }
	    return sql.join('<br><br>');
	},

	/**
	 * generates a string based on the tables of the newest item group
	 *
	 * @return {string} tables contatenated to a from clause
	 */
	getTablesStringLatestGroup: function() {
	    if (!this.getLatestItemGroup())
		throw 'statement.getTablesStringLatestGroup(): no itemGroups in statement';
	    return i2b2.DaTraVExport.tableArrayToSQLString(
		this.getLatestItemGroup().getTables()
	    );
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
	 * adds an item to the currently newest item group
	 * 
	 * @param {string} item_key - i2b2 path
	 * @param {string} operator - i2b2 database operator
	 * @param {string} value - value the item is matched to
	 */
 	addItem: function(item_key, icon, operator, value) {
	    if (!item_key) throw 'statement.addItem(): parameter item_key is null';
	    if (!icon) throw 'statement.addItem(): parameter icon is null';
	    this.getLatestItemGroup().addItem(item_key, icon, operator, value);
 	},

	/**
	 * adds a subquerys resulttablename to an item group
	 *
	 * @param {string} tablename - resulttablename of the subquery
	 */
	addSubQueryTable: function(tablename) {
	    if (!tablename) throw 'statement.addSubQueryTable(): parameter tablename is null';
	    this.getLatestItemGroup().addSubQueryTable(tablename);
	},

 	/**
	 * adds a table expression to tables array, if not already added 
	 *
	 * @param {string} table - table expression 
	 */
 	addTable: function(table) {
	    if (!table) throw 'statement.addTable(): parameter table is null';
 	    if (this.tables.indexOf(table) < 0)
 		this.tables.push(table);
 	},

	/**
	 * merges sql of all item groups with timing set to "SAMEINSTANCENUM"
	 */
	mergeSqlForItemGroupsWithSameInstanceNum: function() {
	    var relevantGroups = [];
	    var tables         = [];
	    var satzarten      = [];
	    var indent         = Array(5).join('&nbsp;');
	    var fromYear, toYear;

	    /*** collect all itemgroups with type SAMEINSTANCENUM ***/
	    for (var i = 0; i < this.itemGroups.length; i++) {
		var itemGroup = this.itemGroups[i];
		if (itemGroup.getTiming() != 'SAMEINSTANCENUM')
		    continue;
		relevantGroups.push(itemGroup);

		for (var j = 0; j < itemGroup.getTables().length; j ++) {
		    satzarten = satzarten.concat(
			itemGroup.getTables()[j].match(/SA\d\d\d/)
		    );
		}

		if (!fromYear || fromYear < itemGroup.getFromYear())
		    fromYear = itemGroup.getFromYear();
		if (!toYear || toYear > itemGroup.getToYear())
		    toYear = itemGroup.getToYear();
	    }
	    if (relevantGroups.length == 0) return;

	    /*** generate tablename ***/
	    var tableName = 
		i2b2.DaTraVExport.model.tablespace + '.'
		+ relevantGroups[0].getTempTableName().replace(/\d*$/, '')
		+ '_sameins';

	    /*** generate from clauses ***/
	    var fromDate = {};
	    var toDate   = {};
	    var tables   = [];

	    if (!fromYear || (toYear && fromYear > toYear))
		throw 'statement.mergeSqlForItemGroupsWithSameInstanceNum(): Year values of panels with SAMEINSTANCENUM set are not compatible';

	    satzarten = i2b2.DaTraVExport.uniqueElements(satzarten);

	    for (var i = 0; i < satzarten.length; i++) {
		fromDate.Year = fromYear;
		toDate.Year   = toYear;
		tables.push(
		    relevantGroups[0].getTableWithAliasForColumn(
			satzarten[i]
			, (fromDate.Year ? fromDate : null)
			, (toDate.Year ? toDate : null)
		    )[0]
		);
	    }

	    /*** generate where constraints ***/
	    var whereConstraints = '(<br>' 
		+ indent + indent + relevantGroups.map(
		    function(x) { return x.constraintsToSQLString(); }
		).join('<br>' + indent + ') AND (<br>' + indent + indent)
		+ '<br>'
		+ indent + ')';
	    
	    return 'DROP TABLE ' + tableName + ';<br>'
		+ 'CREATE TABLE ' + tableName + ' AS (<br>'
		+ 'SELECT ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2'), 'psid') + '<br>'
		+ indent + ', ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('AUSGLEICHSJAHR'), 'ausgleichsjahr') + '<br>'
		+ 'FROM (SELECT * FROM ' + i2b2.DaTraVExport.tableArrayToSQLString(tables) + ') q<br>'
		+ 'WHERE ' + whereConstraints + '<br>'
		+ ');';
	},

 	/**
	 * starts a new item group with specified constraints
	 *
	 * @param {integer} number - number of the group
	 * @param {integer} exclude - 1 if the group is negated
	 * @param {string} timing - ANY, SAMEVIST or SAMEINSTANCE
	 * @param {integer} occurences - least number of times a constraint has to be true
	 * @param {integer} accuracy - not used in i2b2
	 * @param {Object} dateFrom - start date for observation
	 * @param {Object} dateTo - end date for obserfation
	 */
 	addItemGroup: function(number, exclude, timing, occurences, accuracy, dateFrom, dateTo) {
	    if (!number) throw 'statement.addItemGroup(): parameter number is null';
 	    if (!occurences) throw 'statement.addItemGroup(): parameter occurences is null';
	    if (!dateFrom) throw 'statement.addItemGroup(): parameter dateFrom is null - group of a query or subquery does not contain a from-date';
	    if (dateFrom.Year < i2b2.DaTraVExport.model.minStartYear
		|| (dateTo && dateTo.Year < i2b2.DaTraVExport.model.minStartYear)
	       ) {
		throw 'statement.addItemGroup(): dateFrom or dateTo is before ' + i2b2.DaTraVExport.model.minStartYear;
	    }

	    var itemGroup = {
		number        : number,
 	     	exclude       : exclude,
		timing        : timing,
		occurences    : occurences,
		accuracy      : accuracy,
		dateFrom      : dateFrom,
		dateTo        : dateTo,
 	     	items         : [],
		tables        : [],
		subQueryTables: [],

		/**
		 * transforms the itemGroup to SQL syntax
		 *
		 * @return {string} SQL string
		 */
		constraintsToSQLString: function() {
		    var indent    = Array(5).join('&nbsp;'); 
 	    	    var satzarten = this.getSatzarten();
		    var constraints = this.items.map(function(x) { return x.toSQLString(); });

		    // var sql       = this.items.map(
		    // 	function(x) { return x.toSQLString(); }
		    // ).join('<br>' + indent + 'OR ');

		    if (this.subQueryTables.length > 0) {
			constraints += this.subQueryTables.map(
			    function(x) {
				return i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2')) + ' IN (SELECT psid FROM ' + x + ')';
			    }
			);
			// sql += (sql ? '<br>' + indent + 'OR ' : '')
			//     + this.subQueryTables.map(
			//     function(x) {
			// 	return i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2')) + ' IN (SELECT psid FROM ' + x + ')';
			//     }
			// ).join('<br>' + indent + 'OR ');
		    }

		    var sql = '';

		    if (this.occurences > 1) {
			var caseStringPsid1 = i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2'));
			var caseStringPsid2 = i2b2.DaTraVExport.generateCaseString(satzarten, new Array('q.PSID', 'q.PSID2'), null, 'q');
			var caseStringBeri1 = i2b2.DaTraVExport.generateCaseString(satzarten, new Array('BERICHTSJAHR'));
			var caseStringBeri2 = i2b2.DaTraVExport.generateCaseString(satzarten, new Array('BERICHTSJAHR'), null, 'q');

			sql = this.occurences + ' <= (SELECT count(*)<br>'
			    + indent + indent + indent + 'FROM ' + i2b2.DaTraVExport.tableArrayToSQLString(this.tables) + '<br>'
			    + indent + indent + indent + 'WHERE (' + constraints.join('<br>' + indent + indent + indent + indent + 'OR ') + ')<br>'
			    + indent + indent + indent + indent + 'AND ' + caseStringPsid1 + ' = ' + caseStringPsid2 + '<br>'
			    + indent + indent + indent + indent + 'AND ' + caseStringBeri1 + ' = ' + caseStringBeri2 + '<br>'
			    + indent + indent + indent + ')';
		    } else {
			sql = constraints.join('<br>' + indent + 'OR ');
		    }

		    if (this.exclude == 1)
			sql = 'NOT (' + sql + ')';
		    
		    return sql;
 	    	},

		/**
		 * returns the createstatement for the temporary table of the group
		 *
		 * @return {string} create statement
		 */
		toSQLString: function() {
		    var tablespace = i2b2.DaTraVExport.model.tablespace;
		    var satzarten  = this.getSatzarten();
		    var indent     = Array(5).join('&nbsp;');

		    if (this.tables.length == 0 && this.subQueryTables.length == 0)
			throw 'itemGroup.toSQLString(): no data for the group available';
		    
		    if (this.items.length == 0 && this.subQueryTables.length > 0) { // itemgroup contains only one subquery
			var inConstraint = this.subQueryTables.map(
			    function(x) { return 'SELECT psid FROM ' + x; }
			).join('<br>' + indent + 'UNION<br>' + indent);

			return 'DROP TABLE ' + tablespace + '.' + this.getTempTableName() + ';<br>'
			    + 'CREATE TABLE ' + tablespace + '.' + this.getTempTableName() + ' AS (<br>'
			    + (this.exclude == 1 ?
			       'SELECT ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2'), 'psid') + '<br>'
			       + (satzarten.length == 1 && satzarten[0].match(/999/) ?
				  ''
				  : indent + ', ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID2'), 'psid2') + '<br>'
				 )
			       + indent + ', ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('BERICHTSJAHR'), 'berichtsjahr') + '<br>'
			       + 'FROM ' + i2b2.DaTraVExport.tableArrayToSQLString(this.tables) + '<br>'
			       + 'WHERE ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2')) + ' NOT IN (' + inConstraint + ')'
			       : this.subQueryTables.map(
				   function(x) { return 'SELECT psid, berichtsjahr FROM ' + x; }
			       ).join('<br>UNION<br>')
			      )
			    + '<br>);';
		    }
		    
		    return 'DROP TABLE ' + tablespace + '.' + this.getTempTableName() + ';<br>'
			+ 'CREATE TABLE ' + tablespace + '.' + this.getTempTableName() + ' AS (<br>'
			+ 'SELECT ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID', 'PSID2'), 'psid') + '<br>' 
		        + (satzarten.length == 1 && satzarten[0].match(/999/) ?
			   '' 
			   : indent + ', ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('PSID2'), 'psid2') + '<br>'
			  ) // select psid2 if there are multiple satzarten or satzart != 999
			+ indent + ', ' + i2b2.DaTraVExport.generateCaseString(satzarten, new Array('BERICHTSJAHR'), 'berichtsjahr') + '<br>'
			+ 'FROM (SELECT * FROM ' + i2b2.DaTraVExport.tableArrayToSQLString(this.tables) + ') q<br>'
			+ 'WHERE ' + this.constraintsToSQLString() + '<br>);';
		},

		/**
		 * returns an array of used satzarten
		 *
		 * @return {Object[]} array of satzarten
		 */
		getSatzarten: function() {
		    return this.tables.map(
			function(x) {
			    var satzartNr = x.replace(/(.*?)(SA)(\d\d\d)(.*)/, '$3');
			    if (isNaN(satzartNr)) 
				throw 'itemGroup.getSatzarten(): tablename does not contain a satzartNr';
			    return 'SA' + satzartNr;
			}
		    );
		},

		/**
		 * returns the timing value of this item group
		 *
		 * @return {string} timing
		 */
		getTiming: function() {
		    return this.timing;
		},

		/**
		 * returns all tables of the group as array
		 *
		 * @return {Object} tables array
		 */
		getTables: function() {
		    return this.tables;
		},

		/**
		 * returns year value of dateFrom
		 *
		 * @return {integer} fromYear
		 */
		getFromYear: function() {
		    if (!this.dateFrom) return null;
		    return this.dateFrom.Year;
		},

		/**
		 * returns year value of dateTo
		 *
		 * @return {integer} toYear
		 */
		getToYear: function() {
		    if (!this.dateTo) return null;
		    return this.dateTo.Year;
		},

		/**
		 * returns name of the temporary table
		 * if the temporal constraint is set to SAMEVISIT and the group only contains elements of SA999,
		 * the table is not marked as SAMEVISIT
		 *
		 * @return {string} tablename
		 */
		getTempTableName: function() {
		    if (!this.number) throw 'itemGroup.getTempTableName(): number is null';
		    return 'grp_' + this.number
			+ (this.timing == 'SAMEVISIT' && (this.getTables().length > 1 || !this.getTables()[0].match(/SA999/)) ?
			   '_samevisit' : ''
			  );
		},

		/**
		 * generates dimdi db table names, for a given column name
		 * if there are multiple years selected for the itemGroup, 
		 * the table name gets generated for each year (connected by UNION ALL)
		 * 
		 * @param {string} dimdiColumn - valid dimdi database column name
		 * @param {integer} dateFrom
		 * @param {integer} dateTo
		 * @return {Object} array with table and alias
		 */
		getTableWithAliasForColumn: function(dimdiColumn, dateFrom, dateTo) {
		    if (!dimdiColumn) throw 'itemGroup.getTableWithAliasForColumn(): parameter dimdiColumn is null';
		    var table = '';
		    var alias = '';

		    if (!dateFrom) {
			throw 'itemGroup.getTableWithAliasForColumn(): dateFrom is null';
		    } else if(dateFrom && dateTo 
			      && dateFrom.Year > dateTo.Year
			     ) {
			throw 'itemGroup.getTableWithAliasForColumn(): from-year is greater then to-year';
		    } else if (dateFrom 
			       && (!dateTo || dateFrom == dateTo)
			      ) { // missing or equal to-date
			table = this.extractTableWithTablespace(dimdiColumn, dateFrom.Year);
			alias = this.extractTable(dimdiColumn, dateFrom.Year);
		    } else { // from- and to-date given
			for (var i = dateFrom.Year; i <= dateTo.Year; i++) {
		    	    table += 'SELECT * FROM ' + this.extractTableWithTablespace(dimdiColumn, i);
			    alias += this.extractTable(dimdiColumn, i);
			    if (i < dateTo.Year) {
				table += ' UNION ALL ';
				alias += '_';
			    }
			}
			alias = 'V' + dateFrom.Year + '_' + this.extractTable(dimdiColumn, dateTo.Year);
			table = '(' + table + ')'; 
		    }
		    return new Array(table, alias);
		},

		getTableForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.getTableForColumn(): parameter dimdiColumn is null';
		    return this.getTableWithAliasForColumn(dimdiColumn, this.dateFrom, this.dateTo)[0];
		},

		getAliasForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.getAliasForColumn(): parameter dimdiColumn is null';
		    return this.getTableWithAliasForColumn(dimdiColumn, this.dateFrom, this.dateTo)[1];
		},

		/**
		 * adds a dimdi table constraint, generated by getTableForColumn()
		 * to the groups tables array
		 *
		 * @param {string} dimdiColumn - valid dimdi database column name
		 */
		addTableForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.addTableForColumn(): parameter dmdiColumn is null';
		    var table = this.getTableForColumn(dimdiColumn);

		    if (this.tables.indexOf(table) < 0)
			this.tables.push(table);
		},

		/**
		 * adds a subquerys resulttablename to the itemGroup
		 *
		 * @param {string} tablename - name of the resulttable
		 */
		addSubQueryTable: function(tablename) {
		    if (!tablename) throw 'itemGroup.addSubQueryTable(): parameter tablename is null';
		    this.subQueryTables.push(tablename);
		},

		/**
		 * returns the dimdi db table and tablespace, which contains the given dimdi column and year
		 *
		 * @param {string} dimdiColumn - valid column name of the dimdi database
		 * @param {integer} year - Berichtsjahr
		 *
		 * @return {string} table name with tablespace
		 */
 		extractTableWithTablespace: function(dimdiColumn, year) {
		    if (!dimdiColumn) throw 'itemGroup.extractTableWithTablespace(): parameter dimdiColumn is null';
		    if (!year) throw 'itemGroup.extractTableWithTablespace(): parameter year is null';

 		    return i2b2.DaTraVExport.model.tablespace + '.' + this.extractTable(dimdiColumn, year);
 		},

		/**
		 * returns the dimdi db table, which contains the given dimdi column and year
		 * the year is set depending on the SA number:
		 * SA152, SA153, SA451, SA551 and SA651 -> Ausgleichsjahr = Berichtsjahr + 1
		 * SA151, SA751, SA951 and SA999 -> Ausgleichsjahr = Berichtsjahr
		 *
		 * @param {string} dimdiColumn - valid column name of the dimdi database
		 * @param {integer} year - Berichtsjahr
		 *
		 * @return {string} table name
		 */
		extractTable: function(dimdiColumn, year) {
		    if (!dimdiColumn) throw 'itemGroup.extractTable(): parameter dimdiColumn is null';
		    if (!year) throw 'itemGroup.extractTable(): parameter year is null';

		    var satzartNr = dimdiColumn.replace(/(SA)(\d\d\d)(.*)/, '$2');

		    if (isNaN(satzartNr)) throw 'itemGroup.extractTable(): dimdiColumn does not contain a satzartNr';

		    if (['152', '153', '451', '551', '651'].indexOf(satzartNr) != -1)
			year++;

		    return 'V' + year + 'SA' + satzartNr;
		},

		/** 
		 * adds a new item to the items array
		 *
		 * @param {string} dimdiColumn - dimdi database conform column name
		 * @param {string} operator - the operator used by i2b2 to query the i2b2 database
		 * @param {string} value - the value the item is matched to
		 */
 	    	addItem: function(item_key, icon, operator, value) {
		    if (!item_key) throw 'itemGroup.addItem(): parameter item_key is null';
		    if (!icon) throw 'itemGroup.addItem(): parameter icon is null';

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
			icon       : icon,

			/*********************************************/
			/*** specific functions for each catalogue ***/
			generateBSNRConstraint: function(catalogue, value) {
			    if (value == catalogue) // toplevel
				return this.dimdiColumn + ' IS NOT NULL';
			    else if (value.match(/^\d*_\d*$/)) { // folder containins leafs for east and west BSNR
				return this.dimdiColumn
				    + ' IN (' + value.split('_').filter(
					function(x) { return x; }
				    ).map(
					function(x) { return parseInt(x) }
				    ).join(', ') + ')';
			    } else if (value.match(/^\d*$/)) { // leaf
				return this.dimdiColumn + ' = ' + parseInt(value);
			    } else // no leafs in the folder
				throw 'item.generateBSNRConstraint() for folder not yet implemented';
			},

			generatePZNConstraint: function(catalogue, value) {
			    if (value == catalogue) // toplevel
				return this.dimdiColumn + ' IS NOT NULL';
			    else // leaf
				return this.dimdiColumn + ' = ' + parseInt(value);
			    /* no special handlings for folders needed, because they are non-selectable containers */
			},

			generateAGSConstraint: function(catalogue, value) {
			    if (value == catalogue) // toplevel
				return this.dimdiColumn + ' IS NOT NULL';
			    else { // folder or leaf
				return 'CAST (' + this.dimdiColumn + ' AS Varchar(5))'
				    + " LIKE '" + value + "%'";
			    }
			},

			generateICD10GMConstraint: function(catalogue, value) {
			    if (value == catalogue) // toplevel
				return this.dimdiColumn + ' IS NOT NULL';
			    else if (!value.match(/\d/)) { // upper class without codes
				return this.dimdiColumn + ' IN (SELECT CODE '
				    + 'FROM ' + i2b2.DaTraVExport.model.tablespace + '.ICDCODES ' 
				    + "WHERE KAPNR = '" + value + "')";
			    } else if (value.match(/-/)) { // range of codes
				var codes      = value.split('-');
				var initial    = value.substring(0, 1);
				var start      = parseInt(codes[0].substring(1, 3));
				var end        = parseInt(codes[1].substring(1, 3));

				return this.dimdiColumn + " LIKE '" + initial + "%' "
				    + 'AND TO_NUMBER(SUBSTR(' + this.dimdiColumn + ', 2, 2)) BETWEEN ' + start + ' AND ' + end; 
			    } else { // single code group with decimal places or leaf
				return this.dimdiColumn + " LIKE '" + value + "%'"; // % because of optional special characters
			    }
			},
			/*******************************************/

			/**
			 * ### declare new catalogue functions here ###
			 * generates a constraint for a catalogue by executing the matching function
			 *
			 * @param {string} catalogue - name of the catalogue
			 * @param {string} value - items value
			 *
			 * @return {string} constraint for catalogue
			 */
			generateCatalogueConstraint: function(catalogue, value) {
			    switch (catalogue) {
			    case 'ICD-10-GM': return this.generateICD10GMConstraint(catalogue, value);
			    case 'AGS'      : return this.generateAGSConstraint(catalogue, value);
			    case 'BSNR'     : return this.generateBSNRConstraint(catalogue, value);
			    case 'PZN'      : return this.generatePZNConstraint(catalogue, value);
			    default         : throw 'item.toSQLString(): ' + catalogue + ' in query or subquery is not yet supported';
			    }
			},

			/**
			 * transforms the item to SQL
			 *
			 * @return {string} SQL string build from dimdiColumn, operator and value
			 */
 	    		toSQLString: function() {
			    if (!this.dimdiColumn) throw 'item.toSQLString(): dimdiColumn is null';
			    if (!this.item_key) throw 'item.toSQLString(): item_key is null';
			    if (!this.icon) throw 'item.toSQLString(): icon is null';

			    var sql        = '';
			    var constraint = '';
			    var satzartNr  = this.dimdiColumn.replace(/(SA)(\d\d\d)(.*)/, '$2');
			    var regExp     = new RegExp('(.*?' + this.dimdiColumn + '\\\\)([^\\\\]*)(\\\\.*)');
			    var catalogue  = this.item_key.replace(regExp, '$2');
			    var satzart    = 'SA' + satzartNr;
			    var value      = this.item_key.replace(/(.*?\\)([^\\]*?)(\\$)/, '$2');

			    if (isNaN(satzartNr)) throw 'item.toSQLString(): dimdiColumn does not contain a satzartNr';

			    if (value != this.dimdiColumn) // catalogue
				constraint = this.generateCatalogueConstraint(catalogue, value);
			    else { // non-catalogue
 	    			constraint =
				    this.dimdiColumn + ' ' 
				    + this.getModifiedOperator() + ' '
				    + this.getModifiedValue();
			    }

			    return constraint;
 	    		},

			/** 
			 * returns the operator translatet to SQL syntax
			 *
			 * @return {string} operator in SQL syntax
			 */
			getModifiedOperator: function() {
			    if (!this.operator) return 'IS NOT NULL';
			    var operator  = this.operator.replace(/\[.*\]/, '');
			    var sqlMapper = {
				'LT'  : '<'
				, 'LE': '<='
				, 'EQ': '='
				, 'GT': '>'
				, 'GE': '>='
			    };

			    if (operator && sqlMapper[operator])
				return sqlMapper[operator];
			    return operator;
			},

			/** 
			 * returns the value of the item
			 * the value is modified, depending on the datatype and operator
			 *
			 * @return {string} modified value
			 */ 
			getModifiedValue: function() {
			    if (!this.operator) return '';
			    var operator_sufix = this.operator.replace(/(.*?\[)(.*?)(\])/, '$2');

			    switch (this.getDatatype()) {
			    case 'string':
				var value = this.value;
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
				throw 'item.getModifiedValue(): no valid datatype for ' + this.dimdiColumn + ' found';
			    }
			},

			/**
			 * returns 'string' or 'integer' depending on the given dimdi db column name 
			 *
			 * @param {string} 'string' or 'integer'
			 */
			getDatatype: function() {
			    if (!this.dimdiColumn) throw 'item.getDatatype(): dimdiColumn is null';
			    var satzartNr = this.dimdiColumn.replace(/(SA)(\d\d\d)(.*)/, '$2');

			    if (isNaN(satzartNr)) throw 'item.getDatatype(): dimdiColumn does not contain a valid satzartNr';
			    if ((satzartNr == 551 || satzartNr == 651)
				&& this.dimdiColumn.match(/DIAGNOSE|ICD|QUALIFIZIERUNG/)
			       )
				return 'string';

			    return 'integer';
			}
 	    	    };
		    
		    this.items.push(item);
		    this.addTableForColumn(dimdiColumn);
 	    	}
 	    };
	    if (exclude == 1) { // add SA151 and SA152 to find patients with missing entries
		itemGroup.addTableForColumn('SA151');
		itemGroup.addTableForColumn('SA152');
	    }
 	    this.itemGroups.push(itemGroup);
 	}
    };
    
    return statement;
};


