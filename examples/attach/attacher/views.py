from django.http import HttpResponse
from django.template import Context, loader

from attach.settings import BOSH_SERVICE, JABBERID, PASSWORD
from attach.boshclient import BOSHClient

def index(request):
    bc = BOSHClient(JABBERID, PASSWORD, BOSH_SERVICE)
    bc.startSessionAndAuth()

    t = loader.get_template("attacher/index.html")
    c = Context({
	    'jid': bc.jabberid.full(),
	    'sid': bc.sid,
	    'rid': bc.rid,
    })

    return HttpResponse(t.render(c))
