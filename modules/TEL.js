var module_name = 'tel';

// Parse data sent from TEL module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x2B: // Broadcast: Indicator status
			data.command = 'bro';
			data.value   = 'indicator status';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.out(data);
}

module.exports = {
  parse_out          : () => { parse_out(data); },
  send_device_status : () => { bus_commands.send_device_status(module_name); },
}
