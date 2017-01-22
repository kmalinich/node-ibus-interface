#!/usr/bin/env node

const serialport = require('serialport');

// Read/write queues
var queue_read  = [];
var active_read = false;

var queue_write  = [];
var active_write = false;

// Last time any data did something
status.ibus.last_event = now();

// Exposed data
this.active_read  = active_read;
this.active_write = active_write;
this.queue_read   = queue_read;
this.queue_write  = queue_write;
this.send         = send;
this.shutdown     = shutdown;
this.startup      = startup;

// Local data
var device      = '/dev/bmw';
var serial_port = new serialport(device, {
	autoOpen : false,
	parity   : 'even',
	parser   : serialport.parsers.byteLength(1),
});

/*
 * Event handling
 */

// On port error
serial_port.on('error', function(error) {
	console.error('[INTF:PORT]', error);
});

// On port open
serial_port.on('open', function() {
	console.log('[INTF:PORT] Opened [%s]', device);

	// Get some data
	setTimeout(() => {
		omnibus.IKE.obc_refresh();
	}, 5000);
});

// On port close
serial_port.on('close', function() {
	console.log('[INTF:PORT] Closed [%s]', device);
});

// Send the data to the parser
serial_port.on('data', (data) => {
	omnibus.protocol.parser(data);
});


/*
 * Functions
 */

// Open serial port
	function startup(callback) {
// Open port if it is closed
		if (!serial_port.isOpen()) {
			serial_port.open((error) => {
				if (error) {
					console.log('[INTF:PORT]', error);
					callback();
				}
				else {
					console.log('[INTF:PORT] Opened');
					callback();
				}
			});
		}
		else {
			console.log('[INTF:PORT] Already open');
			callback();
		}
	}

// Close serial port
	function shutdown(callback) {
// Close port if it is open
		if (serial_port.isOpen()) {
			serial_port.close((error) => {
				if (error) {
					console.log('[INTF:PORT]', error);
					callback();
				}
				else {
					console.log('[INTF:PORT] Closed');
					callback();
				};
			});
		}
		else {
			console.log('[INTF:PORT] Already closed');
			callback();
		}
	}

// Return false if there's still something to write
	function queue_busy() {
		if (typeof queue_write[0] !== 'undefined' && queue_write.length !== 0) {
			active_write = true;
		}
		else {
			active_write = false;
		}

// console.log('[INTF::QUE] Queue busy: %s', active_write);
		return active_write;
	}

// Write the next message to the serial port
	function write_message() {
// Only write data if port is open
		if (!serial_port.isOpen()) {
			console.log('[INTF:RITE] Chilling until port is open');
			return;
		}

// Do we need to wait longer?
		var time_now = now();
		if (time_now-status.ibus.last_event < 4) {
// Do we still have data?
			if (queue_busy()) {
// console.log('[INTF:RITE] Waiting for %s', time_now-status.ibus.last_event);
				setTimeout(() => {
					write_message();
				}, 4);
			}
			else {
				console.log('[INTF:RITE] Queue done');
			}
		}
		else {
			if (queue_busy()) {
				serial_port.write(queue_write[0], (error) => {
					if (error) { console.log('[INTF:RITE] Failed : ', queue_write[0], error); }

					serial_port.drain((error) => {
// console.log('[INTF::DRN] %s message(s) remain(s)', queue_write.length);

						if (error) {
							console.log('[INTF::DRN] Failed : ', queue_write[0], error);
						}
						else {
// console.log('[INTF:RITE] Success : ', queue_write[0]);

// Successful write, remove this message from the queue
							queue_write.splice(0, 1);

// Do we still have data?
							if (queue_busy()) {
								write_message();
							}
						}
					});
				});
			}
		}
	}

// Insert a message into the write queue
	function send(msg) {
// Generate IBUS message with checksum, etc
		queue_write.push(omnibus.protocol.create(msg));

// console.log('[INTF:SEND] Pushed data into write queue');
		if (active_write === false) {
// console.log('[INTF:SEND] Starting queue write');
			write_message();
		}
	}

module.exports = ibus_interface;
