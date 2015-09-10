AutoForm.hooks({
    'events-form': {
        onSuccess: function (operation, result, template) {
            slidePanel.closePanel();
            Materialize.toast('Event submitted successfully!', 4000);
            if (operation === "insert") {
                Session.set("selected", result);
                $('#congratsModal').openModal();
            }
        },
        onError: function(formType, error) {
            console.error(error);
        }
    }
});
Template.eventsForm.onCreated(function() {
    this.debounce = null;
    this.setCoordinates = function (lat, lng) {
        var instance = Template.instance();
        instance.$('input[name="coordinates.lat"]').val(lat);
        instance.$('input[name="coordinates.lng"]').val(lng);
    };
});
Template.eventsForm.helpers({
    geocodeDataSource: function(query, sync, asyncCallback) {
        var instance = Template.instance();
        if (instance.debounce) {
            Meteor.clearTimeout(instance.debounce);
        }
        const debounceDelay = 500; //wait half a second before triggering search
        instance.debounce = Meteor.setTimeout(function() {
            Meteor.call('getCoords', query, function (error, result) {
                var mapResultToDisplay = function () {
                    return result.map(function (v) {
                            var streetName = _.isNull(v.streetName) ? '' : v.streetName + ' ';
                            var streetNumber = _.isNull(v.streetNumber) ? _.isEmpty(streetName) ? '' : ', ' : +v.streetNumber + ', ';
                            var city  = _.isNull(v.city) ? '' : v.city + ', ';
                            return {
                                value: streetName + streetNumber + city + v.country,
                                lat: v.latitude,
                                lng: v.longitude
                            };
                        }
                    );
                };

                if (error != undefined) {
                    console.error(error);
                    Events.simpleSchema().namedContext("events-form").addInvalidKeys([{
                        name: "location",
                        type: "offline"
                    }]);
                } else {
                    asyncCallback(mapResultToDisplay());
                }
            });
        }, debounceDelay);
    },
    selectedHandler: function (event, suggestion, datasetName) {
        var coordsDefined = !_.isUndefined(suggestion.lat) && !_.isUndefined(suggestion.lng);
        if (coordsDefined) {
            Template.instance().setCoordinates(suggestion.lat,suggestion.lng);
        } else {
            throw Meteor.Error('cords-undefined', 'Coordinates are empty for the selected location');
        }
    },
    selectedEventDoc: function() { return Events.findOne(Session.get('selected')); },
    isEdit: function() { return Session.get('isEdit') }
});

Template.eventsForm.rendered = function() {
    AutoForm.resetForm('events-form');
    Meteor.typeahead.inject();
    var copyCoordsFromSelectedEvent = function () {
        if (Session.get('isEdit')) {
            var selectedEvent = Events.findOne(Session.get('selected'));
            if (selectedEvent != null) {
                Template.instance().setCoordinates(selectedEvent.coordinates.lat, selectedEvent.coordinates.lng);
            }
        }
    };
    copyCoordsFromSelectedEvent();
    var fixMaterializeActiveClassTrigger = function() {
        $('input[name=location]').detach().insertBefore('.twitter-typeahead');
        $('.twitter-typeahead').find('input[type=text]').remove();
    };
    //this is a hack, because Typeahead duplicates input and inserts it inside of a new span item which breaks Materialize
    fixMaterializeActiveClassTrigger();
};

Template.eventsForm.destroyed = function() {
    var $typeahead = $('.typeahead');
    $typeahead.unbind();
    $typeahead.typeahead('destroy');
};