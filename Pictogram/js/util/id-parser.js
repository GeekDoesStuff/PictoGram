import { BitSeq, NUM_ALPHA_BITS } from './bitseq.js';

const VERSION = 1;

export function parseId(id) {
	const reader = new BitSeq().appendAlphas(id).getUnshuffled().getReader();
	const version = 1 + reader.readNum(6);

	let numRows = '';
	let numCols = '';
	let seed = '';
	let msgType = '';
	let enc = null;
	let grid = null;

	switch(version) {
		case 1:
			let gap = reader.readNum(3);
			reader.readNum(gap);
			numRows = reader.readNum(5) + 4; // 4-35
			numCols = reader.readNum(5) + 4; // 4-35
			seed = reader.readNum(31);
			msgType = reader.readNum(1);
			enc = new BitSeq(reader.read());
			break;
		case 2: // picture puzzles: the grid is stored directly instead of a seed
			let gap2 = reader.readNum(3);
			reader.readNum(gap2);
			numRows = reader.readNum(5) + 4;
			numCols = reader.readNum(5) + 4;
			const cells = reader.read(numRows * numCols);
			grid = [];
			for(let r = 0; r < numRows; r++)
				grid.push(Array.from(cells.substring(r * numCols, (r + 1) * numCols), ch => ch == '1' ? 1 : 0));
			msgType = reader.readNum(1);
			enc = new BitSeq(reader.read());
			break;
		case 3: { // picture puzzles, sizes up to 131, grid stored raw or run-length compressed
			const gap3 = reader.readNum(3);
			reader.readNum(gap3);
			numRows = reader.readNum(7) + 4;
			numCols = reader.readNum(7) + 4;
			grid = readGrid(reader, numRows, numCols);
			msgType = reader.readNum(1);
			enc = new BitSeq(reader.read());
			break;
		}
		default:
	}
    
	return { version, numRows, numCols, seed, msgType, enc, grid };
}

export function generateId(numRows, numCols, seed, enc, msgType = 0, version = VERSION, grid = null) {
	let bitSeq = new BitSeq();
	bitSeq.appendNum(version - 1, 6);

	switch(version) {
		case 1: 
			const len = 6 + 3 + 5 + 5 + 31 + 1 + enc.length();
			const gap = (NUM_ALPHA_BITS - len % NUM_ALPHA_BITS) % NUM_ALPHA_BITS;
			
			bitSeq.appendNum(gap, 3);
			bitSeq.appendNum(0, gap);
			bitSeq.appendNum(numRows - 4, 5);
			bitSeq.appendNum(numCols - 4, 5);
			bitSeq.appendNum(seed, 31);
			bitSeq.appendNum(msgType, 1);
			bitSeq.append(enc.get());
			break;
		case 2: {
			const len2 = 6 + 3 + 5 + 5 + numRows * numCols + 1 + enc.length();
			const gap2 = (NUM_ALPHA_BITS - len2 % NUM_ALPHA_BITS) % NUM_ALPHA_BITS;

			bitSeq.appendNum(gap2, 3);
			bitSeq.appendNum(0, gap2);
			bitSeq.appendNum(numRows - 4, 5);
			bitSeq.appendNum(numCols - 4, 5);
			for(let r = 0; r < numRows; r++)
				for(let c = 0; c < numCols; c++)
					bitSeq.append(grid[r][c] == 1 ? '1' : '0');
			bitSeq.appendNum(msgType, 1);
			bitSeq.append(enc.get());
			break;
		}
		case 3: {
			const payload = writeGrid(grid, numRows, numCols);
			const len3 = 6 + 3 + 7 + 7 + payload.length + 1 + enc.length();
			const gap3 = (NUM_ALPHA_BITS - len3 % NUM_ALPHA_BITS) % NUM_ALPHA_BITS;

			bitSeq.appendNum(gap3, 3);
			bitSeq.appendNum(0, gap3);
			bitSeq.appendNum(numRows - 4, 7);
			bitSeq.appendNum(numCols - 4, 7);
			bitSeq.append(payload);
			bitSeq.appendNum(msgType, 1);
			bitSeq.append(enc.get());
			break;
		}
		default:
	}

	return bitSeq.getShuffled().toAlphas();
}


// ---- grid storage for version 3: 1 flag bit, then raw bits or run lengths (Elias-gamma) ----

function gammaEncode(n) { // n >= 1
	const bin = n.toString(2);
	return '0'.repeat(bin.length - 1) + bin;
}

function gammaDecode(reader) {
	let zeros = 0;
	while(reader.left() > 0 && reader.readNum(1) === 0)
		zeros++;
	if(reader.left() < zeros && zeros > 0)
		return 1;
	// the leading 1 was consumed by the loop above
	return zeros === 0 ? 1 : (1 << zeros) | reader.readNum(zeros);
}

function writeGrid(grid, numRows, numCols) {
	let raw = '';
	for(let r = 0; r < numRows; r++)
		for(let c = 0; c < numCols; c++)
			raw += grid[r][c] == 1 ? '1' : '0';

	let rle = raw[0];
	let run = 1;
	for(let i = 1; i <= raw.length; i++) {
		if(i < raw.length && raw[i] === raw[i - 1]) {
			run++;
		} else {
			rle += gammaEncode(run);
			run = 1;
		}
	}
	// the last run is implied by the total number of cells, but keeping it is simpler and safe

	return rle.length < raw.length ? '1' + rle : '0' + raw;
}

function readGrid(reader, numRows, numCols) {
	const total = numRows * numCols;
	const isRle = reader.readNum(1) === 1;
	let cells = '';
	if(isRle) {
		let bit = reader.readNum(1);
		while(cells.length < total) {
			const run = gammaDecode(reader);
			cells += String(bit).repeat(Math.min(run, total - cells.length));
			bit = 1 - bit;
		}
	} else {
		cells = reader.read(total);
	}
	const grid = [];
	for(let r = 0; r < numRows; r++)
		grid.push(Array.from(cells.substring(r * numCols, (r + 1) * numCols), ch => ch == '1' ? 1 : 0));
	return grid;
}
