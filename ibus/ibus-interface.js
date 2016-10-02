var serialport    = require('serialport');
var util          = require('util');
var event_emitter = require('events');
var ibus_protocol = require('./ibus-protocol.js');
var bus_modules   = require('../lib/bus-modules.js');

var Log           = require('log');
var log           = new Log('info');

var ibus_interface = function(device_path) {

	// self reference
	var _self = this;

	// exposed data
	this.get_interface = get_interface;
	this.startup       = startup;
	this.shutdown      = shutdown;
	this.send_message  = send_message;

	// local data
	var device             = '/dev/ttyUSB0';
	var last_activity_time = process.hrtime();
	var parser;
	var queue              = [];
	var serial_port        = new serialport(device, {
		autoOpen : false,
		baudRate : 9600,
		dataBits : 8,
		parity   : 'even',
		parser   : serialport.parsers.raw,
		rtscts   : true,
		stopBits : 1,
	});

	/*
	 * Event handling
	 */

	// On port error
	serial_port.on('error', function(error) {
		console.error('[INTF] Port error: %s', error);
	});

	// On port open
	serial_port.on('open', function() {
		console.log('[INTF] Port open [%s]', device);

		parser = new ibus_protocol();
		parser.on('message', on_message);
		serial_port.pipe(parser);
		watch_for_empty_bus(process_write_queue);
	});

	// On port close
	serial_port.on('close', function() {
		console.log('[INTF] Port closed [%s]', device);
		parser = null;
	});

	// On data RX
	serial_port.on('data', function(data) {
		// log.debug('[INTF] Data on port: ', data);
		last_activity_time = process.hrtime();
	});

	// Open serial port
	function startup() {
		console.log('[INTF] Starting');

		// Open port if it is closed
		if (!serial_port.isOpen()) {
			console.log('[INTF] Opening port');
			serial_port.open();
		}
	}

	// Close serial port
	function shutdown(callback) {
		console.log('[INTF] Ending');

		// Close port if it is open
		if (serial_port.isOpen()) {
			console.log('[INTF] Closing port');
			serial_port.close();
		}

		callback();
	}

	function get_ht_diff_time(time) {
		// ts = [seconds, nanoseconds]
		var ts = process.hrtime(time);

		// Convert seconds to miliseconds and nanoseconds to miliseconds as well
		return (ts[0] * 1000) + (ts[1] / 1000000);
	};

	function watch_for_empty_bus(workerFn) {        
		if (get_ht_diff_time(last_activity_time) >= 20) {
			workerFn(function success() {
				// Operation is ready, resume looking for an empty bus
				setImmediate(watch_for_empty_bus, workerFn);
			});
		}
		else {
			// Keep looking for an empty bus
			setImmediate(watch_for_empty_bus, workerFn);
		}
	}

	function process_write_queue(ready) {
		// noop on empty queue
		if (queue.length <= 0) {
			ready();
			return;
		}

		// Process 1 message
		var data_buffer = queue.pop();

		// log.debug(clc.blue('[INTF] Write queue length: '), queue.length);

		serial_port.write(data_buffer, function(error, resp) {
			// if (error) {
			//   log.error('[INTF] Failed to write: ' + error);
			// }
			// else {
			// }

			// console.log('[INTF]', clc.red('Wrote to device:'), data_buffer, resp);

			serial_port.drain(function(error) {
				// log.debug(clc.white('Data drained'));
				// This counts as an activity, so mark it
				last_activity_time = process.hrtime();
				ready();
			});

			_self.emit('message_sent');
		});
	}

	function get_interface() {
		return serial_port;
	}

	function on_message(msg) {
		// log.debug('[INTF] Raw message: ', msg.src, msg.len, msg.dst, msg.msg, '[' + msg.msg.toString('ascii') + ']', msg.crc);
		_self.emit('data', msg);
	}

	function send_message(msg) {
		var data_buffer = ibus_protocol.create_ibus_message(msg);

		// console.log('[send_message] Src :', bus_modules.get_module_name(msg.src.toString(16)));
		// console.log('[send_message] Dst :', bus_modules.get_module_name(msg.dst.toString(16)));
		// log.debug('[INTF] Send message: ', data_buffer);

		if (queue.length > 1000) {
			// log.warning('[INTF] Queue too large, dropping message..', data_buffer);
			return;
		}

		queue.unshift(data_buffer);
	}

};

util.inherits(ibus_interface, event_emitter);
module.exports = ibus_interface;
