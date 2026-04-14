export function setupFlash(app) {
  app.addHook('preHandler', (request, reply, done) => {
    if (!request.flash) {
      request.flash = {};
    }
    
    reply.flash = (type, message) => {
      request.flash[type] = message;
    };
    
    reply.locals = reply.locals || {};
    reply.locals.flash = request.flash;
    
    done();
  });
}
