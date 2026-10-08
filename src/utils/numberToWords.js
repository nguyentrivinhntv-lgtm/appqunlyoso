const units = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const tens = ['lẻ', 'mười', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const hundreds = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTwoDigit(b, c, hasHundred) {
  let output = [];
  let isTen = false;

  if (b === 0) {
    if (hasHundred && c === 0) return [];
    if (hasHundred) {
      output.push(tens[0]);
    }
  } else if (b === 1) {
    output.push(tens[1]);
    isTen = true;
  } else {
    output.push(tens[b]);
    output.push('mươi');
  }

  if (c !== 0) {
    if (c === 1 && b > 1) {
      output.push('mốt');
    } else if (c === 5 && b > 0) {
      output.push('lăm');
    } else {
      output.push(units[c]);
    }
  }

  return output;
}

function readThreeDigit(a, b, c, readZeroHundred) {
  let output = [];
  if (a !== 0 || readZeroHundred) {
    output.push(hundreds[a]);
    output.push('trăm');
  }
  output = output.concat(readTwoDigit(b, c, a !== 0 || readZeroHundred));
  return output;
}

export function numberToWords(number) {
  if (number === 0) return 'Không đồng';
  if (!number) return '';

  let numStr = Math.round(number).toString();
  let chunks = [];
  while (numStr.length > 0) {
    chunks.push(numStr.slice(-3));
    numStr = numStr.slice(0, -3);
  }

  let words = [];
  const suffixes = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  for (let i = chunks.length - 1; i >= 0; i--) {
    let chunk = chunks[i];
    let a = chunk.length === 3 ? parseInt(chunk[0]) : 0;
    let b = chunk.length >= 2 ? parseInt(chunk[chunk.length - 2]) : 0;
    let c = parseInt(chunk[chunk.length - 1]);

    if (a === 0 && b === 0 && c === 0) continue;

    let readZeroHundred = chunk.length === 3 && i !== chunks.length - 1;
    let chunkWords = readThreeDigit(a, b, c, readZeroHundred);
    
    words = words.concat(chunkWords);
    words.push(suffixes[i]);
  }

  let result = words.join(' ').trim().replace(/\s+/g, ' ');
  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + ' đồng./.';
}
