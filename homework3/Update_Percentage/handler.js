const connect_to_db = require('./db');

// GET BY TALK HANDLER

const talk = require('./Talk');

module.exports.update_percentage = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log('Received event:', JSON.stringify(event, null, 2));
    let body = {}
    if (event.body) {
        body = JSON.parse(event.body)
    }
    // set default
    if(!body.id) {
        callback(null, {
                    statusCode: 500,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Could not update the percentage. Talk id is null.'
        })
    }
    
    if(!body.grad) {
        callback(null, {
                    statusCode: 500,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Could not update the percentage. Percentage is null.'
        })
    }
    
    connect_to_db().then(() => {
        console.log('=> get_all talks');
        var new_grad = 0;
        var t;
        talk.find({_id: body.id})
            .then(talks => {
                if(body.grad == 0) {
                    callback(null, {
                        statusCode: 500,
                        headers: { 'Content-Type': 'text/plain' },
                        body: 'Could not update the percentage. New percentage is null.'
                    })
                }
                if(talks[0].gradimento == "NaN")
                    new_grad = body.grad;
                    else
                    new_grad = Math.round(0.2 * parseInt(body.grad) + 0.8 * parseInt(talks[0].gradimento));
                t = {
                    "old_percentage" : talks[0].gradimento,
                    "new_percentage": String(new_grad)
                }
                
                // update MongoDB
                    talk.updateOne({_id: body.id}, {"$set": {"gradimento": String(new_grad)}}
                    ).then(updated => {
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(t)
                    })
                })
                .catch(err =>
                    callback(null, {
                        statusCode: err.statusCode || 500,
                        headers: { 'Content-Type': 'text/plain' },
                        body: 'Error while updating the percentage.'
                    })
                )
            })
            .catch(err =>
                callback(null, {
                    statusCode: err.statusCode || 500,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Could not fetch the talks.'
                })
            );
    });
};