Disco Dancing with XMPP

      There are many things one can do via XMPP. The list is
  endlist. But one thing that some forget about is discovering
  services a XMPP entity or server provides. In most cases a human or
  user does not care about this information and should not care. But
  you may have a website or web application that needs this
  information in order to decide what options to show to your
  users. You can do this very easily with JQuery, Strophe, and
  Punjab. 

  	  We start with Punjab or a BOSH connection manager. This is
  needed so we can connect to a XMPP server. First, lets download
  punjab.
 
  svn co https://code.stanziq.com/svn/punjab/trunk punjab

  After we have punjab go into the directory and install punjab.

  cd punjab
  python setup.py install

  Then create a .tac file to configure Punjab.

  See punjab.tac 

  Next, we will need Strophe. Lets download thelatest version from
  svn too. 

  cd /directory/where/you/configured/punjab/html

  svn co https://code.stanziq.com/svn/strophe/trunk/strophejs

  In your html directory you will then begin to create your disco browser.  

  Version 1 we take the basic example and modify it to do disco.

  Version 2 we add anonymous login

  Version 3 we make it pretty 

  Version 4 we add handlers for different services
