var module_name = 'ihka';

// Parse data sent from IHKA module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x83: // AC compressor status
			data.command = 'bro';
			data.value   = 'AC compressor status '+data.msg;
			break;

		case 0xA0: // Diagnostic command replies
			data.command = 'diagnostic command';
			data.value   = 'acknowledged: '+data.msg;
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
};
