#!/usr/bin/env node

// npm libraries
var dbus = require('dbus-native');
var wait = require('wait.for');

// Bitmasks in hex
var bit_0 = 0x01; // 1
var bit_1 = 0x02; // 2
var bit_2 = 0x04; // 4
var bit_3 = 0x08; // 8
var bit_4 = 0x10; // 16
var bit_5 = 0x20; // 32
var bit_6 = 0x40; // 64
var bit_7 = 0x80; // 128

var LCM = function(omnibus) {
	// Self reference
	var _self = this;

	// Exposed data
	this.bit_set             = bit_set;
	this.bit_test            = bit_test;
	this.comfort_turn        = comfort_turn;
	this.io_status_decode    = io_status_decode;
	this.io_status_encode    = io_status_encode;
	this.lcm_data            = lcm_data;
	this.lcm_get             = lcm_get;
	this.lcm_set             = lcm_set;
	this.light_status_decode = light_status_decode;
	this.parse_out          = parse_out;
	this.reset               = reset;
	this.welcome_lights      = welcome_lights;

	// Parse data sent from LCM module
	function parse_out(data) {
		// Init variables
		var src      = data.src;
		var dst      = data.dst;
		var message  = data.msg;

		var command;
		var value;

		switch (message[0]) {
			case 0x02: // Broadcast: device status
				if (message[1] == 0x00) {
					command = 'device status';
					value   = 'ready';
				}

				else if (message[1] == 0x01) {
					command = 'device status';
					value   = 'ready after reset';
				}
				break;
	
			case 0x10: // Request: ignition status
				command = 'request';
				value   = 'ignition status';
				break;
	
			case 0x54: // Broadcast: vehicle data
				command = 'broadcast';
				value   = 'vehicle data';
				// vehicle_data_decode(message);
				break;
	
			case 0x5B: // Broadcast: light status
				command = 'broadcast';
				value   = 'light status';
				light_status_decode(message);
				break;
	
			case 0x5C: // Broadcast: light dimmer status
				command = 'broadcast';
				value   = 'light dimmer status';
				omnibus.status.lights.dimmer = message[1];
				break;
	
			case 0x79: // Request: door/flap status
				command = 'request';
				value   = 'door/flap status';
				break;
	
			case 0xA0: 
				command = 'current IO status';
				omnibus.LCM.io_status_decode(message);
				break;
	
			default:
				command = 'unknown';
				value   = new Buffer(message);
				break;
		}

		console.log('[%4s->%4s] %s:', data.src_name, data.dst_name, command, value);
	}


	// [0x5B] Decode a light status message from the LCM and act upon the results
	function light_status_decode(message) {
		// Lights on
		if (message[1] == 0x00)          { omnibus.status.lights.all_off        = true; } else { omnibus.status.lights.all_off        = false; }
		if (bit_test(message[1], bit_0)) { omnibus.status.lights.standing_front = true; } else { omnibus.status.lights.standing_front = false; }
		if (bit_test(message[1], bit_1)) { omnibus.status.lights.lowbeam        = true; } else { omnibus.status.lights.lowbeam        = false; }
		if (bit_test(message[1], bit_2)) { omnibus.status.lights.highbeam       = true; } else { omnibus.status.lights.highbeam       = false; }
		if (bit_test(message[1], bit_3)) { omnibus.status.lights.fog_front      = true; } else { omnibus.status.lights.fog_front      = false; }
		if (bit_test(message[1], bit_4)) { omnibus.status.lights.fog_rear       = true; } else { omnibus.status.lights.fog_rear       = false; }
		if (bit_test(message[1], bit_7)) { omnibus.status.lights.turn_fast      = true; } else { omnibus.status.lights.turn_fast      = false; }

		// Faulty
		if (message[2] == 0x00)          { omnibus.status.lights_faulty.all_ok         = true; } else { omnibus.status.lights_faulty.all_ok         = false; }
		if (bit_test(message[2], bit_0)) { omnibus.status.lights_faulty.standing_front = true; } else { omnibus.status.lights_faulty.standing_front = false; }
		if (bit_test(message[2], bit_1)) { omnibus.status.lights_faulty.lowbeam        = true; } else { omnibus.status.lights_faulty.lowbeam        = false; }
		if (bit_test(message[2], bit_2)) { omnibus.status.lights_faulty.highbeam       = true; } else { omnibus.status.lights_faulty.highbeam       = false; }
		if (bit_test(message[2], bit_3)) { omnibus.status.lights_faulty.fog_front      = true; } else { omnibus.status.lights_faulty.fog_front      = false; }
		if (bit_test(message[2], bit_4)) { omnibus.status.lights_faulty.fog_rear       = true; } else { omnibus.status.lights_faulty.fog_rear       = false; }
		if (bit_test(message[2], bit_5)) { omnibus.status.lights_faulty.turn_left      = true; } else { omnibus.status.lights_faulty.turn_left      = false; }
		if (bit_test(message[2], bit_6)) { omnibus.status.lights_faulty.turn_right     = true; } else { omnibus.status.lights_faulty.turn_right     = false; }
		if (bit_test(message[2], bit_7)) { omnibus.status.lights_faulty.license_plate  = true; } else { omnibus.status.lights_faulty.license_plate  = false; }

		// Lights on
		if (bit_test(message[3], bit_1)) { omnibus.status.lights.brake           = true; } else { omnibus.status.lights.brake           = false; }
		if (bit_test(message[3], bit_2)) { omnibus.status.lights.turn_sync       = true; } else { omnibus.status.lights.turn_sync       = false; }
		if (bit_test(message[3], bit_3)) { omnibus.status.lights.standing_rear   = true; } else { omnibus.status.lights.standing_rear   = false; }
		if (bit_test(message[3], bit_4)) { omnibus.status.lights.trailer         = true; } else { omnibus.status.lights.trailer         = false; }
		if (bit_test(message[3], bit_5)) { omnibus.status.lights.reverse         = true; } else { omnibus.status.lights.reverse         = false; }
		if (bit_test(message[3], bit_6)) { omnibus.status.lights.trailer_reverse = true; } else { omnibus.status.lights.trailer_reverse = false; }
		if (bit_test(message[3], bit_7)) { omnibus.status.lights.hazard          = true; } else { omnibus.status.lights.hazard          = false; }

		// Faulty
		if (bit_test(message[4], bit_0)) { omnibus.status.lights_faulty.brake_right         = true; } else { omnibus.status.lights_faulty.brake_right         = false; }
		if (bit_test(message[4], bit_1)) { omnibus.status.lights_faulty.brake_left          = true; } else { omnibus.status.lights_faulty.brake_left          = false; }
		if (bit_test(message[4], bit_2)) { omnibus.status.lights_faulty.standing_rear_right = true; } else { omnibus.status.lights_faulty.standing_rear_right = false; }
		if (bit_test(message[4], bit_3)) { omnibus.status.lights_faulty.standing_rear_left  = true; } else { omnibus.status.lights_faulty.standing_rear_left  = false; }
		if (bit_test(message[4], bit_4)) { omnibus.status.lights_faulty.lowbeam_right       = true; } else { omnibus.status.lights_faulty.lowbeam_right       = false; }
		if (bit_test(message[4], bit_5)) { omnibus.status.lights_faulty.lowbeam_left        = true; } else { omnibus.status.lights_faulty.lowbeam_left        = false; }

		/*
		 * Comfort turn signal handling
		 */

		// Store status in temporary variables
		var turn_left_on  = bit_test(message[1], bit_5); 
		var turn_right_on = bit_test(message[1], bit_6);

		// If comfort turn is not currently engaged
		if (omnibus.status.lights.turn_comfort == true) {
			console.log('[LCM]  Comfort turn signal currently engaged');
		}
		else {
			// If
			//
			// left signal is now on, and
			// right signal is now off, and
			// left signal was previously off:
			//
			// Set turn_left_depress_time timestamp
			if (turn_left_on && !turn_right_on && omnibus.status.lights.turn_left == false) {
				omnibus.status.lights.turn_left_depress_time = Date.now();
			}

			// If
			//
			// left signal is now off, and
			// right signal is now on, and
			// right signal was previously off:
			//
			// Set turn_right_depress_time timestamp
			if (!turn_left_on && turn_right_on && omnibus.status.lights.turn_right == false) {
				omnibus.status.lights.turn_right_depress_time = Date.now();
			}

			// If left signal is now off and right signal is now off
			if (!turn_left_on && !turn_right_on) {

				// If left signal was previously on
				if (omnibus.status.lights.turn_left == true) {
					// Set turn_left_release_time timestamp
					omnibus.status.lights.turn_left_release_time = Date.now();

					// Calculate time difference between initial on and off
					var turn_left_depress_elapsed = omnibus.status.lights.turn_left_release_time-omnibus.status.lights.turn_left_depress_time;

					// If the time difference is less than 1000ms, fire comfort turn signal
					if (turn_left_depress_elapsed < 1000) {
						console.log('[LCM]  Left turn signal depress elapsed time: %s ms. Firing left comfort turn signal', turn_left_depress_elapsed);
						comfort_turn('left');
					}
				}

				// If right signal was previously on
				if (omnibus.status.lights.turn_right == true) {
					// Set turn_right_release_time timestamp
					omnibus.status.lights.turn_right_release_time = Date.now();

					// Calculate time difference between initial on and off
					var turn_right_depress_elapsed = omnibus.status.lights.turn_right_release_time-omnibus.status.lights.turn_right_depress_time;

					// If the time difference is less than 1000ms, fire comfort turn signal
					if (turn_right_depress_elapsed < 1000) {
						console.log('[LCM]  Right turn signal depress elapsed time: %s ms. Firing right comfort turn signal', turn_right_depress_elapsed);
						comfort_turn('right');
					}
				}
			}
		}


		// Afterwards, set the status in omnibus.status.lights as usual
		if (turn_right_on) { omnibus.status.lights.turn_right = true; } else { omnibus.status.lights.turn_right = false; }
		if (turn_left_on)  { omnibus.status.lights.turn_left  = true; } else { omnibus.status.lights.turn_left  = false; }

		console.log('[node-bmw] Decoded light status message');
	}

	// Handle incoming commands
	function lcm_data(data) {
		if (typeof data['lcm-get'] !== 'undefined') {
			lcm_get();
		}

		else {
			// Dirty assumption
			io_status_encode(data);
		}
	}

	// Comfort turn signal handling
	function comfort_turn(action) {
		console.log('[LCM]  Comfort turn signal - \'%s\'', action);

		// Set status variable
		omnibus.status.lights.turn_comfort = true;

		switch (action) {
			case 'left':
				var lcm_object = { switch_turn_left: true };
				io_status_encode(lcm_object);
				break;
			case 'right':
				var lcm_object = { switch_turn_right: true };
				io_status_encode(lcm_object);
				break;
		}

		// Turn off comfort turn signal - 1 blink is 500ms, so 5x blink is 2500ms
		setTimeout(function() {
			reset();

			// Set status variable
			omnibus.status.lights.turn_comfort = false;
		}, 2500);
	}

	// Welcome lights on unlocking/locking
	function welcome_lights(action) {
		console.log('[LCM]  Welcome lights - \'%s\'', action);

		switch (action) {
			case 'on' :
				var lcm_object = {
					output_standing_front_left  : true,
					output_standing_front_right : true,
					output_standing_rear_right  : true,
					output_standing_rear_left   : true,
					output_license_rear_right   : true,
				};

				io_status_encode(lcm_object);
				break;
			case 'off':
				reset();
				break;
		}
	}

	function reset() {
		console.log('[LCM]  Resetting');
		var lcm_object = {};
		io_status_encode(lcm_object);
	}


	// Get LCM IO status
	function lcm_get() {
		var src = 0x3F; // DIA
		var dst = 0xD0; // GLO
		var cmd = [0x0B, 0x00, 0x00, 0x00, 0x00]; // Get IO status 

		var ibus_packet = {
			src: src,
			dst: dst,
			msg: new Buffer(cmd),
		}

		// Send the message
		console.log('[LCM]  Sending \'Get IO status\' packet');
		omnibus.ibus_connection.send_message(ibus_packet);
	}

	// Send message to LCM
	function lcm_set(packet) {
		var src = 0x3F; // DIA
		var dst = 0xD0; // LCM
		var cmd = 0x0C; // Set IO status 

		// Add the command to the beginning of the LCM hex array
		packet.unshift(cmd);

		var ibus_packet = {
			src: src,
			dst: dst,
			msg: new Buffer(packet),
		}

		// Send the message
		console.log('[LCM]  Sending \'Set IO status\' packet');
		omnibus.ibus_connection.send_message(ibus_packet);
	}

	// Test if a bit in a bitmask is set
	function bit_test(num, bit) {
		if ((num & bit) != 0) {
			return true;
		}
		else {
			return false;
		}
	}

	// Set a bit in a bitmask
	function bit_set(num, bit) {
		num |= bit;
		return num;
	}

	// Encode the LCM bitmask string from an input of true/false values
	function io_status_encode(array) {
		// Initialize bitmask variables
		var bitmask_0  = 0x00;
		var bitmask_1  = 0x00;
		var bitmask_2  = 0x00;
		var bitmask_3  = 0x00;
		var bitmask_4  = 0x00;
		var bitmask_5  = 0x00;
		var bitmask_6  = 0x00;
		var bitmask_7  = 0x00;
		var bitmask_8  = 0x00;
		var bitmask_9  = 0xFF; // Dimmer from 00-FF
		// 10-11 are .. something, don't know yet.
		var bitmask_10 = 0x00;
		var bitmask_11 = 0x00;

		// Set the various bitmask values according to the input array
		if(array.clamp_30a                       ) { bitmask_0 = bit_set(bitmask_0, bit_0); }
		if(array.input_fire_extinguisher         ) { bitmask_0 = bit_set(bitmask_0, bit_1); }
		if(array.input_preheating_fuel_injection ) { bitmask_0 = bit_set(bitmask_0, bit_2); }
		if(array.input_carb                      ) { bitmask_0 = bit_set(bitmask_0, bit_4); }
		if(array.clamp_r                         ) { bitmask_0 = bit_set(bitmask_0, bit_6); }
		if(array.clamp_30b                       ) { bitmask_0 = bit_set(bitmask_0, bit_7); }
		if(array.input_key_in_ignition           ) { bitmask_1 = bit_set(bitmask_1, bit_0); }
		if(array.input_seat_belts_lock           ) { bitmask_1 = bit_set(bitmask_1, bit_1); }
		if(array.switch_highbeam_flash           ) { bitmask_1 = bit_set(bitmask_1, bit_2); }
		if(array.switch_hazard                   ) { bitmask_1 = bit_set(bitmask_1, bit_4); }
		if(array.input_kfn                       ) { bitmask_1 = bit_set(bitmask_1, bit_5); }
		if(array.input_armoured_door             ) { bitmask_1 = bit_set(bitmask_1, bit_6); }
		if(array.input_brake_fluid_level         ) { bitmask_1 = bit_set(bitmask_1, bit_7); }
		if(array.switch_brake                    ) { bitmask_2 = bit_set(bitmask_2, bit_0); }
		if(array.switch_highbeam                 ) { bitmask_2 = bit_set(bitmask_2, bit_1); }
		if(array.switch_fog_front                ) { bitmask_2 = bit_set(bitmask_2, bit_2); }
		if(array.switch_fog_rear                 ) { bitmask_2 = bit_set(bitmask_2, bit_4); }
		if(array.switch_standing                 ) { bitmask_2 = bit_set(bitmask_2, bit_5); }
		if(array.switch_turn_right               ) { bitmask_2 = bit_set(bitmask_2, bit_6); }
		if(array.switch_turn_left                ) { bitmask_2 = bit_set(bitmask_2, bit_7); }
		if(array.input_air_suspension            ) { bitmask_3 = bit_set(bitmask_3, bit_0); }
		if(array.input_hold_up_alarm             ) { bitmask_3 = bit_set(bitmask_3, bit_1); }
		if(array.input_washer_fluid_level        ) { bitmask_3 = bit_set(bitmask_3, bit_2); }
		if(array.switch_lowbeam_2                ) { bitmask_3 = bit_set(bitmask_3, bit_3); }
		if(array.switch_lowbeam_1                ) { bitmask_3 = bit_set(bitmask_3, bit_4); }
		if(array.clamp_15                        ) { bitmask_3 = bit_set(bitmask_3, bit_5); }
		if(array.input_engine_failsafe           ) { bitmask_3 = bit_set(bitmask_3, bit_6); }
		if(array.input_tire_defect               ) { bitmask_3 = bit_set(bitmask_3, bit_7); }
		if(array.output_license_rear_left        ) { bitmask_4 = bit_set(bitmask_4, bit_2); }
		if(array.output_brake_rear_left          ) { bitmask_4 = bit_set(bitmask_4, bit_3); }
		if(array.output_brake_rear_right         ) { bitmask_4 = bit_set(bitmask_4, bit_4); }
		if(array.output_highbeam_front_right     ) { bitmask_4 = bit_set(bitmask_4, bit_5); }
		if(array.output_highbeam_front_left      ) { bitmask_4 = bit_set(bitmask_4, bit_6); }
		if(array.output_standing_front_left      ) { bitmask_5 = bit_set(bitmask_5, bit_0); }
		if(array.output_standing_inner_rear_left ) { bitmask_5 = bit_set(bitmask_5, bit_1); }
		if(array.output_fog_front_left           ) { bitmask_5 = bit_set(bitmask_5, bit_2); }
		if(array.output_reverse_rear_left        ) { bitmask_5 = bit_set(bitmask_5, bit_3); }
		if(array.output_lowbeam_front_left       ) { bitmask_5 = bit_set(bitmask_5, bit_4); }
		if(array.output_lowbeam_front_right      ) { bitmask_5 = bit_set(bitmask_5, bit_5); }
		if(array.output_fog_front_right          ) { bitmask_5 = bit_set(bitmask_5, bit_6); }
		if(array.input_vertical_aim              ) { bitmask_6 = bit_set(bitmask_6, bit_1); }
		if(array.output_license_rear_right       ) { bitmask_6 = bit_set(bitmask_6, bit_2); }
		if(array.output_standing_rear_left       ) { bitmask_6 = bit_set(bitmask_6, bit_3); }
		if(array.output_brake_rear_middle        ) { bitmask_6 = bit_set(bitmask_6, bit_4); }
		if(array.output_standing_front_right     ) { bitmask_6 = bit_set(bitmask_6, bit_5); }
		if(array.output_turn_front_right         ) { bitmask_6 = bit_set(bitmask_6, bit_6); }
		if(array.output_turn_rear_left           ) { bitmask_6 = bit_set(bitmask_6, bit_7); }
		if(array.output_turn_rear_right          ) { bitmask_7 = bit_set(bitmask_7, bit_1); }
		if(array.output_fog_rear_left            ) { bitmask_7 = bit_set(bitmask_7, bit_2); }
		if(array.output_standing_inner_rear_right) { bitmask_7 = bit_set(bitmask_7, bit_3); }
		if(array.output_standing_rear_right      ) { bitmask_7 = bit_set(bitmask_7, bit_4); }
		if(array.output_turn_front_left          ) { bitmask_7 = bit_set(bitmask_7, bit_6); }
		if(array.output_reverse_rear_right       ) { bitmask_7 = bit_set(bitmask_7, bit_7); }
		if(array.mode_failsafe                   ) { bitmask_8 = bit_set(bitmask_8, bit_0); }
		if(array.output_led_switch_hazard        ) { bitmask_8 = bit_set(bitmask_8, bit_2); }
		if(array.output_led_switch_light         ) { bitmask_8 = bit_set(bitmask_8, bit_3); }
		if(array.output_reverse_rear_trailer     ) { bitmask_8 = bit_set(bitmask_8, bit_5); }
		if(array.mode_sleep                      ) { bitmask_8 = bit_set(bitmask_8, bit_6); }

		// LCM dimmer
		if(array.dimmer_value                    ) { bitmask_9 = parseInt(array.dimmer_value); }

		// Suspect	
		// array.clamp_58g
		// array.output_fog_rear_right
		// array.output_fog_rear_trailer

		// ?? 
		// if(array.) { bitmask_0 = bit_set(bitmask_0, bit_3) ; }
		// if(array.) { bitmask_0 = bit_set(bitmask_0, bit_5) ; }
		// if(array.) { bitmask_1 = bit_set(bitmask_1, bit_3) ; }
		// if(array.) { bitmask_2 = bit_set(bitmask_2, bit_3) ; }
		// if(array.) { bitmask_4 = bit_set(bitmask_4, bit_0) ; }
		// if(array.) { bitmask_4 = bit_set(bitmask_4, bit_1) ; }
		// if(array.) { bitmask_4 = bit_set(bitmask_4, bit_7) ; }
		// if(array.) { bitmask_4 = bit_set(bitmask_5, bit_7) ; }
		// if(array.) { bitmask_6 = bit_set(bitmask_6, bit_0) ; }
		// if(array.) { bitmask_7 = bit_set(bitmask_7, bit_0) ; }
		// if(array.) { bitmask_7 = bit_set(bitmask_7, bit_5) ; }
		// if(array.) { bitmask_8 = bit_set(bitmask_8, bit_1) ; }
		// if(array.) { bitmask_8 = bit_set(bitmask_8, bit_4) ; }
		// if(array.) { bitmask_8 = bit_set(bitmask_8, bit_7) ; }

		// Assemble the output array
		var output = [
			bitmask_0,
			bitmask_1,
			bitmask_2,
			bitmask_3,
			bitmask_4,
			bitmask_5,
			bitmask_6,
			bitmask_7,
			bitmask_8,
			bitmask_9,
			bitmask_10,
			bitmask_11,
		];

		// console.log('[LCM]  io_status_encode() output: %s', output);
		lcm_set(output);
	}

	// Decode the LCM bitmask string and output an array of true/false values
	function io_status_decode(array) {
		var bitmask_0  = array[1];
		var bitmask_1  = array[2];
		var bitmask_2  = array[3];
		var bitmask_3  = array[4];
		var bitmask_4  = array[5];
		var bitmask_5  = array[6];
		var bitmask_6  = array[7];
		var bitmask_7  = array[8];
		var bitmask_8  = array[9];
		var bitmask_9  = array[10]; // Dimmer from 00-FF
		var bitmask_10 = array[11];
		var bitmask_11 = array[12];

		var clamp_15                         = bit_test(bitmask_3, bit_5);
		var clamp_30a                        = bit_test(bitmask_0, bit_0);
		var clamp_30b                        = bit_test(bitmask_0, bit_7);
		var clamp_r                          = bit_test(bitmask_0, bit_6);
		var input_air_suspension             = bit_test(bitmask_3, bit_0);
		var input_armoured_door              = bit_test(bitmask_1, bit_6);
		var input_brake_fluid_level          = bit_test(bitmask_1, bit_7);
		var input_carb                       = bit_test(bitmask_0, bit_4);
		var input_engine_failsafe            = bit_test(bitmask_3, bit_6);
		var input_fire_extinguisher          = bit_test(bitmask_0, bit_1);
		var input_hold_up_alarm              = bit_test(bitmask_3, bit_1);
		var input_key_in_ignition            = bit_test(bitmask_1, bit_0);
		var input_kfn                        = bit_test(bitmask_1, bit_5);
		var input_preheating_fuel_injection  = bit_test(bitmask_0, bit_2);
		var input_seat_belts_lock            = bit_test(bitmask_1, bit_1);
		var input_tire_defect                = bit_test(bitmask_3, bit_7);
		var input_vertical_aim               = bit_test(bitmask_6, bit_1);
		var input_washer_fluid_level         = bit_test(bitmask_3, bit_2);
		var mode_failsafe                    = bit_test(bitmask_8, bit_0);
		var mode_sleep                       = bit_test(bitmask_8, bit_6);
		var output_brake_rear_left           = bit_test(bitmask_4, bit_3);
		var output_brake_rear_middle         = bit_test(bitmask_6, bit_4);
		var output_brake_rear_right          = bit_test(bitmask_4, bit_4);
		var output_fog_front_left            = bit_test(bitmask_5, bit_2);
		var output_fog_front_right           = bit_test(bitmask_5, bit_6);
		var output_fog_rear_left             = bit_test(bitmask_7, bit_2);
		var output_highbeam_front_left       = bit_test(bitmask_4, bit_6);
		var output_highbeam_front_right      = bit_test(bitmask_4, bit_5);
		var output_led_switch_hazard         = bit_test(bitmask_8, bit_2);
		var output_led_switch_light          = bit_test(bitmask_8, bit_3);
		var output_license_rear_left         = bit_test(bitmask_4, bit_2);
		var output_license_rear_right        = bit_test(bitmask_6, bit_2);
		var output_lowbeam_front_left        = bit_test(bitmask_5, bit_4);
		var output_lowbeam_front_right       = bit_test(bitmask_5, bit_5);
		var output_reverse_rear_left         = bit_test(bitmask_5, bit_3);
		var output_reverse_rear_right        = bit_test(bitmask_7, bit_7);
		var output_reverse_rear_trailer      = bit_test(bitmask_8, bit_5);
		var output_standing_front_left       = bit_test(bitmask_5, bit_0);
		var output_standing_front_right      = bit_test(bitmask_6, bit_5);
		var output_standing_inner_rear_left  = bit_test(bitmask_5, bit_1);
		var output_standing_inner_rear_right = bit_test(bitmask_7, bit_3);
		var output_standing_rear_left        = bit_test(bitmask_6, bit_3);
		var output_standing_rear_right       = bit_test(bitmask_7, bit_4);
		var output_turn_front_left           = bit_test(bitmask_7, bit_6);
		var output_turn_front_right          = bit_test(bitmask_6, bit_6);
		var output_turn_rear_left            = bit_test(bitmask_6, bit_7);
		var output_turn_rear_right           = bit_test(bitmask_7, bit_1);
		var switch_brake                     = bit_test(bitmask_2, bit_0);
		var switch_fog_front                 = bit_test(bitmask_2, bit_2);
		var switch_fog_rear                  = bit_test(bitmask_2, bit_4);
		var switch_hazard                    = bit_test(bitmask_1, bit_4);
		var switch_highbeam                  = bit_test(bitmask_2, bit_1);
		var switch_highbeam_flash            = bit_test(bitmask_1, bit_2);
		var switch_lowbeam_1                 = bit_test(bitmask_3, bit_4);
		var switch_lowbeam_2                 = bit_test(bitmask_3, bit_3);
		var switch_standing                  = bit_test(bitmask_2, bit_5);
		var switch_turn_left                 = bit_test(bitmask_2, bit_7);
		var switch_turn_right                = bit_test(bitmask_2, bit_6);
		var dimmer_value                     = bitmask_9;

		// Suspect
		// var clamp_58g                       = bit_test(bitmask_, bit_);
		// var output_fog_rear_right           = bit_test(bitmask_, bit_);
		// var output_fog_rear_trailer         = bit_test(bitmask_, bit_);

		var output = {
			clamp_15                         : clamp_15,
			clamp_30a                        : clamp_30a,
			clamp_30b                        : clamp_30b,
			clamp_r                          : clamp_r,
			dimmer_value                     : dimmer_value,
			input_air_suspension             : input_air_suspension,
			input_armoured_door              : input_armoured_door,
			input_brake_fluid_level          : input_brake_fluid_level,
			input_carb                       : input_carb,
			input_engine_failsafe            : input_engine_failsafe,
			input_fire_extinguisher          : input_fire_extinguisher,
			input_hold_up_alarm              : input_hold_up_alarm,
			input_key_in_ignition            : input_key_in_ignition,
			input_kfn                        : input_kfn,
			input_preheating_fuel_injection  : input_preheating_fuel_injection,
			input_seat_belts_lock            : input_seat_belts_lock,
			input_tire_defect                : input_tire_defect,
			input_vertical_aim               : input_vertical_aim,
			input_washer_fluid_level         : input_washer_fluid_level,
			mode_failsafe                    : mode_failsafe,
			mode_sleep                       : mode_sleep,
			output_brake_rear_middle         : output_brake_rear_middle,
			output_brake_rear_right          : output_brake_rear_right,
			output_fog_front_left            : output_fog_front_left,
			output_fog_front_right           : output_fog_front_right,
			output_fog_rear_left             : output_fog_rear_left,
			output_highbeam_front_left       : output_highbeam_front_left,
			output_highbeam_front_right      : output_highbeam_front_right,
			output_led_switch_hazard         : output_led_switch_hazard,
			output_led_switch_light          : output_led_switch_light,
			output_license_rear_left         : output_license_rear_left,
			output_license_rear_right        : output_license_rear_right,
			output_lowbeam_front_left        : output_lowbeam_front_left,
			output_lowbeam_front_right       : output_lowbeam_front_right,
			output_reverse_rear_left         : output_reverse_rear_left,
			output_reverse_rear_right        : output_reverse_rear_right,
			output_reverse_rear_trailer      : output_reverse_rear_trailer,
			output_standing_front_left       : output_standing_front_left,
			output_standing_front_right      : output_standing_front_right,
			output_standing_inner_rear_left  : output_standing_inner_rear_left,
			output_standing_inner_rear_right : output_standing_inner_rear_right,
			output_standing_rear_left        : output_standing_rear_left,
			output_standing_rear_right       : output_standing_rear_right,
			output_turn_front_left           : output_turn_front_left,
			output_turn_front_right          : output_turn_front_right,
			output_turn_rear_left            : output_turn_rear_left,
			output_turn_rear_right           : output_turn_rear_right,
			switch_brake                     : switch_brake,
			switch_fog_front                 : switch_fog_front,
			switch_fog_rear                  : switch_fog_rear,
			switch_hazard                    : switch_hazard,
			switch_highbeam                  : switch_highbeam,
			switch_highbeam_flash            : switch_highbeam_flash,
			switch_lowbeam_1                 : switch_lowbeam_1,
			switch_lowbeam_2                 : switch_lowbeam_2,
			switch_standing                  : switch_standing,
			switch_turn_left                 : switch_turn_left,
			switch_turn_right                : switch_turn_right,
		}

		// Suspect
		// clamp_58g                        : clamp_58g,
		// output_fog_rear_right            : output_fog_rear_right,
		// output_fog_rear_trailer          : output_fog_rear_trailer,

		//return output;
		// console.log(output);

		console.log('[node-bmw] Decoded current IO status');
	}

	// All the possible values to send to the LCM
	var array_of_possible_values = {
		clamp_15                         : true,
		clamp_30a                        : true,
		clamp_30b                        : true,
		clamp_r                          : true,
		dimmer_value                     : 0xFF,
		input_air_suspension             : true,
		input_armoured_door              : true,
		input_brake_fluid_level          : true,
		input_carb                       : true,
		input_engine_failsafe            : true,
		input_fire_extinguisher          : true,
		input_hold_up_alarm              : true,
		input_key_in_ignition            : true,
		input_kfn                        : true,
		input_preheating_fuel_injection  : true,
		input_seat_belts_lock            : true,
		input_tire_defect                : true,
		input_vertical_aim               : true,
		input_washer_fluid_level         : true,
		mode_failsafe                    : true,
		mode_sleep                       : true,
		output_brake_rear_left           : true,
		output_brake_rear_middle         : true,
		output_brake_rear_right          : true,
		output_fog_front_left            : true,
		output_fog_front_right           : true,
		output_fog_rear_left             : true,
		output_highbeam_front_left       : true,
		output_highbeam_front_right      : true,
		output_led_switch_hazard         : true,
		output_led_switch_light          : true,
		output_license_rear_left         : true,
		output_license_rear_right        : true,
		output_lowbeam_front_left        : true,
		output_lowbeam_front_right       : true,
		output_reverse_rear_left         : true,
		output_reverse_rear_right        : true,
		output_reverse_rear_trailer      : true,
		output_standing_front_left       : true,
		output_standing_front_right      : true,
		output_standing_inner_rear_left  : true,
		output_standing_inner_rear_right : true,
		output_standing_rear_left        : true,
		output_standing_rear_right       : true,
		output_turn_front_left           : true,
		output_turn_front_right          : true,
		output_turn_rear_left            : true,
		output_turn_rear_right           : true,
		switch_brake                     : true,
		switch_fog_front                 : true,
		switch_fog_rear                  : true,
		switch_hazard                    : true,
		switch_highbeam                  : true,
		switch_highbeam_flash            : true,
		switch_lowbeam_1                 : true,
		switch_lowbeam_2                 : true,
		switch_standing                  : true,
		switch_turn_left                 : true,
		switch_turn_right                : true,

		// Suspect
		// clamp_58g                        : true,
		// output_fog_rear_right            : true,
		// output_fog_rear_trailer          : true,
	}
}

module.exports = LCM;
