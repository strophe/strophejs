
var NS_DISCO_INFO = 'http://jabber.org/protocol/disco#info';
var NS_DISCO_ITEM = 'http://jabber.org/protocol/disco#items';


// Disco stuff
Disco = function () {
  // Class that does nothing
};

Disco.prototype = {
 showBrowser: function() {
    // Browser Display
    var disco = $('#disco');
    var jid = $('#jid');
    var server = connection.jid.split('@')[1];

    // display input box
    disco.append("<div id='server'><form id='browse' name='browse'>Server : <input type='text' name='server' id='server' value='"+server+"' /><input type='submit' value='browse'/></form></div>");
    
    // add handler for search form 
    $("#browse").bind('submit', function () {
	this.startBrowse($("#server").get(0).value);
	return false;
      });
    
    this.startBrowse(server);
  },

 closeBrowser: function() {
    var disco = $('#disco');
    
    disco.empty();
  },

 startBrowse: function(server) {
    // build iq request
    var id = 'startBrowse';
    
    var discoiq = $iq({'from':connection.jid+"/"+connection.resource,
		       'to':server,
		       'id':id,
		       'type':'get'}
      )
    .c('query', {'xmlns': NS_DISCO_INFO});
    
    connection.addHandler(this._cbBrowse, null, 'iq', 'result', id);
    connection.send(discoiq.tree());
    
  },

 _cbBrowse: function(e) {
    var elem = $(e); // make this Element a JQuery Element
    alert(e);
    
    return false; // return false to remove the handler
  },

};
 
