# punjab tac file
from twisted.web import server, resource, static
from twisted.application import service, internet

from punjab.httpb  import Httpb, HttpbService

root = static.File("./") # This needs to be the directory 
                         # where you will have your html 
                         # and javascript.

b = resource.IResource(HttpbService(1)) # turn on debug with 1
root.putChild('bosh', b)


site  = server.Site(root)

application = service.Application("punjab")
internet.TCPServer(5280, site).setServiceParent(application)
