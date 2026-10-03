/**
 * Ghibli Music Engine v2 — Real Studio Ghibli Streams, Piano Lofi Radio & Masterpieces
 * Features: Shuffle, Loop (One / All), Playlists by Film, Auto-skip on error
 * Seamlessly plays authentic Studio Ghibli piano soundscapes & live 24/7 focus radio streams.
 */

// Note frequency helper (A4 = 440Hz)
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NOTE_MAP = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
};

function parseNote(str) {
  if (!str || str === 'REST') return null;
  const match = str.match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) return null;
  const [, name, oct] = match;
  const semitone = NOTE_MAP[name.toUpperCase()];
  if (semitone === undefined) return null;
  return 12 * (parseInt(oct, 10) + 1) + semitone;
}

const ARCHIVE_BASE = 'https://archive.org/download/relaxingpianobest-ghiblihayaomiyazakicollection/';

/**
 * Verified file names from archive.org metadata API.
 * Each URL encodes the actual filename found on the server.
 */
const ARCHIVE_FILES = {
  bird:       '01%20Bird%20Person_%20Nausica%C3%A4%20of%20the%20Vall.mp3',
  howl:       "02%20The%20Promise%20of%20the%20World_%20Howl's.mp3",
  stroll:     '03%20Stroll_%20My%20Neighbor%20Totoro%20(Piano.mp3',
  earthsea:   "04%20Teru's%20Song_%20Tales%20From%20Earthsea.mp3",
  poppy:      '05%20Summer%20of%20Good-bye_%20From%20Up%20On%20Po.mp3',
  nausicaa06: '06%20Nausica%C3%A4%20of%20the%20Valley%20of%20the%20Win.mp3',
  porco:      '07%20Once%20in%20a%20While%2C%20Talk%20of%20the%20Old.mp3',
  country:    '08%20Country%20Road_%20Whisper%20of%20the%20Hear.mp3',
  rouge:      "09%20Message%20Of%20Rouge_%20Kiki's%20Delivery.mp3",
  wind:       '10%20The%20Path%20of%20Wind_%20My%20Neighbor%20Tot.mp3',
  mononoke:   '11%20Princess%20Mononoke%20(Piano).mp3',
  hikouki:    '12%20Hikouki-Gumo_%20The%20Wind%20Rises%20(Pia.mp3',
  always:     '13%20Always%20With%20Me_%20Spirited%20Away%20(Pi.mp3',
  ocean:      "14%20A%20Town%20with%20an%20Ocean%20View_%20Kiki's.mp3",
  ponyo:      '15%20Ponyo%20on%20the%20Cliff%20by%20the%20Sea%20(Pi.mp3',
  arrietty:   "16%20Arrietty's%20Song_%20The%20Borrower%20Arr.mp3",
  summer:     '17%20The%20Name%20of%20Life_%20Spirited%20Away%20(.mp3',
  totoro:     '18%20My%20Neighbor%20Totoro%20(Piano).mp3',
  ashitaka:   '19%20The%20Legend%20of%20Ashitaka_%20Princess.mp3',
  cat:        '20%20Become%20The%20Wind_%20The%20Cat%20Returns.mp3',
  laputa:     '21%20Carrying%20You_%20Castle%20in%20the%20Sky%20(.mp3',
  requiem:    '22%20Nausica%C3%A4%20Requiem_%20Nausica%C3%A4%20of%20the.mp3',
  kindness:   "23%20If%20I've%20Been%20Enveloped%20By%20Tendern.mp3",
  reprise:    '24%20Reprise_%20Spirited%20Away%20(Piano).mp3',
};

/**
 * Film-based playlist categories
 */
export const PLAYLISTS = [
  { id: 'all', name: 'Tất cả', icon: '🎵' },
  { id: 'spirited', name: 'Spirited Away', icon: '🐉' },
  { id: 'totoro', name: 'My Neighbor Totoro', icon: '🌳' },
  { id: 'kiki', name: "Kiki's Delivery", icon: '🧹' },
  { id: 'mononoke', name: 'Princess Mononoke', icon: '🐺' },
  { id: 'howl_film', name: "Howl's Castle", icon: '🏰' },
  { id: 'nausicaa', name: 'Nausicaä', icon: '🌿' },
  { id: 'others', name: 'Phim khác', icon: '🌸' },
];

/** Loop modes */
export const LOOP_MODE = {
  OFF: 'off',       // Play once then stop
  ALL: 'all',       // Loop entire playlist/queue
  ONE: 'one',       // Repeat current track
};

/**
 * 24 Genuine Studio Ghibli Masterpieces
 * All archive.org URLs verified against actual server filenames.
 */
export const GHIBLI_TRACKS = [
  // --- SPIRITED AWAY (3 tracks: 17, 13, 24) ---
  {
    id: 'ghibli_summer',
    title: "The Name of Life (Inochi no Namae)",
    film: 'Spirited Away (Vùng Đất Linh Hồn)',
    author: 'Joe Hisaishi',
    tempo: 68,
    desc: 'Bản piano huyền thoại êm đềm, thanh bình mang lại sự an yên tột đỉnh.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.summer}`,
    playlist: 'spirited',
    melody: [
      ['E4', 1.0], ['G4', 1.0], ['A4', 1.0], ['B4', 1.0],
      ['C5', 2.0], ['B4', 1.0], ['A4', 1.0],
      ['G4', 2.0], ['E4', 2.0],
    ],
    chords: [
      [['F3', 'A3', 'C4', 'E4'], 4.0],
      [['G3', 'B3', 'D4', 'F4'], 4.0],
    ]
  },
  {
    id: 'ghibli_always',
    title: 'Always With Me (Itsumo Nando Demo)',
    film: 'Spirited Away (Luôn Có Nhau - Ending)',
    author: 'Youmi Kimura',
    tempo: 88,
    desc: 'Giai điệu mộc mạc, chạm sâu đến đáy lòng xua tan mọi âu lo và áp lực.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.always}`,
    playlist: 'spirited',
    melody: [
      ['C4', 1.0], ['E4', 1.0], ['G4', 1.0],
      ['A4', 2.0], ['G4', 1.0],
      ['E4', 2.0], ['D4', 1.0],
    ],
    chords: [
      [['C3', 'G3', 'E4'], 3.0],
      [['F2', 'C3', 'A3'], 3.0],
    ]
  },
  {
    id: 'ghibli_reprise',
    title: 'Reprise / Futatabi (Tương Phùng Trên Sông Kohaku)',
    film: 'Spirited Away (Chuyến Phiêu Lưu Của Chihiro)',
    author: 'Joe Hisaishi',
    tempo: 70,
    desc: 'Khúc ca tương ngộ vỡ òa cảm xúc đẹp đẽ nhất lịch sử Studio Ghibli.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.reprise}`,
    playlist: 'spirited',
    melody: [
      ['A4', 1.0], ['B4', 1.0], ['C5', 2.0],
      ['D5', 1.5], ['C5', 0.5], ['B4', 2.0],
    ],
    chords: [
      [['A2', 'E3', 'A3', 'C4'], 4.0],
      [['F2', 'C3', 'F3', 'A3'], 4.0],
    ]
  },

  // --- HOWL'S MOVING CASTLE (1 track: 02) ---
  {
    id: 'ghibli_howl',
    title: 'The Promise of the World (Sekai no Yakusoku)',
    film: "Howl's Moving Castle (Lâu Đài Của Howl)",
    author: 'Joe Hisaishi / Chieko Baisho',
    tempo: 76,
    desc: 'Giai điệu lời hứa thế giới ngọt ngào, da diết và ấm áp như vòng tay bao bọc.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.howl}`,
    playlist: 'howl_film',
    melody: [
      ['D4', 1.0], ['G4', 1.0], ['Bb4', 1.0],
      ['D5', 2.0], ['C5', 0.5], ['Bb4', 0.5],
      ['A4', 2.0], ['D4', 1.0],
    ],
    chords: [
      [['G2', 'D3', 'G3'], 3.0],
      [['D2', 'A2', 'D3'], 3.0],
    ]
  },

  // --- MY NEIGHBOR TOTORO (3 tracks: 10, 18, 03) ---
  {
    id: 'ghibli_totoro_wind',
    title: 'Path of the Wind (Kaze no Toorimichi)',
    film: 'My Neighbor Totoro (Hàng Xóm Của Tôi Là Totoro)',
    author: 'Joe Hisaishi',
    tempo: 72,
    desc: 'Âm thanh trong trẻo của cơn gió lành lướt qua ngọn đồi xanh mướt.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.wind}`,
    playlist: 'totoro',
    melody: [
      ['F#4', 1.0], ['G#4', 1.0], ['A4', 1.5], ['B4', 0.5],
      ['C#5', 2.0], ['B4', 1.0], ['A4', 1.0],
    ],
    chords: [
      [['F#3', 'A3', 'C#4'], 4.0],
      [['D3', 'F#3', 'A3', 'C#4'], 4.0],
    ]
  },
  {
    id: 'ghibli_totoro_theme',
    title: 'My Neighbor Totoro Main Theme (Tonari no Totoro)',
    film: 'My Neighbor Totoro (Hàng Xóm Của Tôi Là Totoro)',
    author: 'Joe Hisaishi',
    tempo: 96,
    desc: 'Bản hòa tấu Piano tươi vui, ngập tràn sức sống và năng lượng tích cực.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.totoro}`,
    playlist: 'totoro',
    melody: [
      ['C4', 1.0], ['E4', 1.0], ['G4', 2.0],
      ['A4', 1.0], ['G4', 1.0], ['E4', 2.0],
    ],
    chords: [
      [['C3', 'E3', 'G3'], 4.0],
      [['F2', 'A2', 'C3'], 4.0],
    ]
  },
  {
    id: 'ghibli_totoro_stroll',
    title: 'Stroll (Sanpo)',
    film: 'My Neighbor Totoro (Đi Dạo Cùng Totoro)',
    author: 'Joe Hisaishi',
    tempo: 104,
    desc: 'Khúc dạo chơi hồn nhiên, nhịp bước vui vẻ trên con đường làng.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.stroll}`,
    playlist: 'totoro',
    melody: [
      ['G4', 1.0], ['E4', 1.0], ['C4', 2.0],
    ],
    chords: [
      [['C3', 'E3', 'G3'], 4.0],
    ]
  },

  // --- KIKI'S DELIVERY SERVICE (3 tracks: 14, 09, 23) ---
  {
    id: 'ghibli_kiki_ocean',
    title: 'A Town with an Ocean View (Umi no Mieru Machi)',
    film: "Kiki's Delivery Service (Dịch Vụ Giao Hàng Kiki)",
    author: 'Joe Hisaishi',
    tempo: 82,
    desc: 'Giai điệu vui tươi, trong trẻo như hương gió biển thổi vào buổi sớm bình yên.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.ocean}`,
    playlist: 'kiki',
    melody: [
      ['E4', 0.5], ['F#4', 0.5], ['G4', 1.0], ['A4', 1.0],
      ['B4', 1.5], ['C5', 0.5], ['B4', 1.0], ['A4', 1.0],
    ],
    chords: [
      [['E3', 'G3', 'B3'], 4.0],
      [['C3', 'E3', 'G3', 'B3'], 4.0],
    ]
  },
  {
    id: 'ghibli_kiki_rouge',
    title: 'Message of Rouge (Rouge no Dengon)',
    film: "Kiki's Delivery Service (Dịch Vụ Giao Hàng Kiki)",
    author: 'Yumi Matsutoya',
    tempo: 98,
    desc: 'Khúc dạo đầu tươi vui trên chiếc chổi bay giữa bầu trời xanh ngát.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.rouge}`,
    playlist: 'kiki',
    melody: [
      ['C4', 1.0], ['E4', 1.0], ['G4', 1.0], ['A4', 1.0],
    ],
    chords: [
      [['C3', 'E3', 'G3'], 4.0],
    ]
  },
  {
    id: 'ghibli_kiki_kindness',
    title: 'Wrapped in Kindness (Yasashisa ni Tsutsumareta Nara)',
    film: "Kiki's Delivery Service (Bao Bọc Trong Dịu Dàng)",
    author: 'Yumi Matsutoya',
    tempo: 86,
    desc: 'Bao bọc trong sự dịu dàng, vỗ về tâm hồn sau những giờ học căng thẳng.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.kindness}`,
    playlist: 'kiki',
    melody: [
      ['G4', 1.0], ['A4', 1.0], ['B4', 2.0],
    ],
    chords: [
      [['G3', 'B3', 'D4'], 4.0],
    ]
  },

  // --- PRINCESS MONONOKE (2 tracks: 11, 19) ---
  {
    id: 'ghibli_mononoke',
    title: 'Princess Mononoke Main Theme (Mononoke Hime)',
    film: 'Princess Mononoke (Công Chúa Sói Mononoke)',
    author: 'Joe Hisaishi',
    tempo: 65,
    desc: 'Khúc tráng ca thiêng liêng và u buồn của rừng già đại ngàn nguyên sơ.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.mononoke}`,
    playlist: 'mononoke',
    melody: [
      ['D4', 1.5], ['E4', 0.5], ['F4', 2.0],
      ['G4', 1.5], ['A4', 0.5], ['F4', 2.0],
    ],
    chords: [
      [['D3', 'F3', 'A3'], 4.0],
      [['Bb2', 'D3', 'F3'], 4.0],
    ]
  },
  {
    id: 'ghibli_ashitaka',
    title: 'The Legend of Ashitaka (Ashitaka Sekki)',
    film: 'Princess Mononoke (Huyền Thoại Ashitaka)',
    author: 'Joe Hisaishi',
    tempo: 66,
    desc: 'Hào khí thanh tịnh, dẫn dắt tâm trí vững vàng tập trung cao độ.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.ashitaka}`,
    playlist: 'mononoke',
    melody: [
      ['D4', 1.5], ['E4', 0.5], ['F4', 2.0],
    ],
    chords: [
      [['D3', 'F3', 'A3'], 4.0],
    ]
  },

  // --- CASTLE IN THE SKY (1 track: 21) ---
  {
    id: 'ghibli_laputa',
    title: 'Carrying You (Kimi wo Nosete)',
    film: 'Castle in the Sky (Lâu Đài Trên Không Laputa)',
    author: 'Joe Hisaishi',
    tempo: 70,
    desc: 'Bài ca đưa ta bay lên những vì sao, hoài niệm và sâu sắc khôn nguôi.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.laputa}`,
    playlist: 'others',
    melody: [
      ['A4', 1.0], ['B4', 1.0], ['C5', 1.5], ['B4', 0.5],
      ['A4', 1.0], ['B4', 1.0], ['E4', 2.0],
    ],
    chords: [
      [['A2', 'E3', 'A3', 'C4'], 4.0],
      [['E2', 'B2', 'E3', 'G#3'], 4.0],
    ]
  },

  // --- NAUSICAÄ (3 tracks: 01, 06, 22) ---
  {
    id: 'ghibli_nausicaa_bird',
    title: 'Bird Person (Tori no Hito)',
    film: 'Nausicaä of the Valley of the Wind (Nàng Nausicaä)',
    author: 'Joe Hisaishi',
    tempo: 75,
    desc: 'Bản hòa tấu vĩ đại về tình yêu thiên nhiên bao la và sự tái sinh diệu kỳ.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.bird}`,
    playlist: 'nausicaa',
    melody: [
      ['A4', 1.0], ['C5', 1.0], ['E5', 2.0],
    ],
    chords: [
      [['A2', 'E3', 'A3', 'C4'], 4.0],
    ]
  },
  {
    id: 'ghibli_nausicaa_valley',
    title: 'Nausicaä of the Valley of the Wind',
    film: 'Nausicaä (Thung Lũng Gió)',
    author: 'Joe Hisaishi',
    tempo: 72,
    desc: 'Bản giao hưởng hùng vĩ của thung lũng gió và khu rừng độc.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.nausicaa06}`,
    playlist: 'nausicaa',
    melody: [
      ['C4', 1.0], ['E4', 1.0], ['G4', 2.0],
    ],
    chords: [
      [['C3', 'E3', 'G3'], 4.0],
    ]
  },
  {
    id: 'ghibli_nausicaa_requiem',
    title: 'Nausicaä Requiem (Khúc Tưởng Niệm Nausicaä)',
    film: 'Nausicaä of the Valley of the Wind',
    author: 'Joe Hisaishi',
    tempo: 64,
    desc: 'Tiếng đàn ngân vang giữa cánh đồng vàng óng rực rỡ dưới nắng mai.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.requiem}`,
    playlist: 'nausicaa',
    melody: [
      ['D4', 1.0], ['F4', 1.0], ['A4', 2.0],
    ],
    chords: [
      [['D3', 'F3', 'A3'], 4.0],
    ]
  },

  // --- OTHER FILMS ---
  {
    id: 'ghibli_country_road',
    title: 'Country Road (Take Me Home)',
    film: 'Whisper of the Heart (Lời Thì Thầm Của Trái Tim)',
    author: 'Bill Danoff / Yuji Nomi',
    tempo: 84,
    desc: 'Con đường về nhà êm đềm nâng niu những hoài bão tuổi trẻ bình dị.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.country}`,
    playlist: 'others',
    melody: [
      ['G4', 1.0], ['A4', 1.0], ['B4', 2.0],
      ['B4', 1.0], ['A4', 1.0], ['G4', 1.0], ['E4', 1.0],
    ],
    chords: [
      [['G3', 'B3', 'D4'], 4.0],
      [['E3', 'G3', 'B3'], 4.0],
    ]
  },
  {
    id: 'ghibli_wind_rises',
    title: 'Hikouki-Gumo (Vapor Trail / Đám Mây Bay)',
    film: 'The Wind Rises (Gió Nổi)',
    author: 'Yumi Matsutoya / Joe Hisaishi',
    tempo: 78,
    desc: 'Dải mây trắng vắt ngang trời xanh, hoài bão ước mơ và sự tự do vô bờ.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.hikouki}`,
    playlist: 'others',
    melody: [
      ['A4', 1.0], ['C5', 1.0], ['E5', 2.0],
    ],
    chords: [
      [['A2', 'E3', 'A3', 'C4'], 4.0],
    ]
  },
  {
    id: 'ghibli_ponyo',
    title: 'Ponyo on the Cliff by the Sea (Gake no Ue no Ponyo)',
    film: 'Ponyo (Nàng Tiên Cá Ponyo)',
    author: 'Joe Hisaishi',
    tempo: 104,
    desc: 'Giai điệu vui tươi, hồn nhiên rạng rỡ của sóng biển mùa hè ấm áp.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.ponyo}`,
    playlist: 'others',
    melody: [
      ['C4', 0.5], ['C4', 0.5], ['D4', 1.0], ['E4', 1.0],
    ],
    chords: [
      [['C3', 'E3', 'G3'], 4.0],
    ]
  },
  {
    id: 'ghibli_arrietty',
    title: "Arrietty's Song (Bài Ca Của Arrietty)",
    film: 'The Secret World of Arrietty (Thế Giới Bí Mật Của Arrietty)',
    author: 'Cécile Corbel',
    tempo: 80,
    desc: 'Tiếng hạc cầm và piano thanh khiết giữa khu vườn hoa lá tí hon thơ mộng.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.arrietty}`,
    playlist: 'others',
    melody: [
      ['D4', 1.0], ['F4', 1.0], ['A4', 2.0],
    ],
    chords: [
      [['D3', 'F3', 'A3'], 4.0],
    ]
  },
  {
    id: 'ghibli_cat_returns',
    title: 'Become the Wind (Kaze ni Naru)',
    film: 'The Cat Returns (Loài Mèo Trả Ơn)',
    author: 'Ayano Tsuji',
    tempo: 96,
    desc: 'Khúc đàn nhẹ nhõm, thong dong như làn gió xuân mang lại nụ cười sảng khoái.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.cat}`,
    playlist: 'others',
    melody: [
      ['C4', 1.0], ['D4', 1.0], ['E4', 2.0],
    ],
    chords: [
      [['C3', 'E3', 'G3'], 4.0],
    ]
  },
  {
    id: 'ghibli_porco',
    title: 'Once in a While, Talk of the Old Days',
    film: 'Porco Rosso (Chú Heo Màu Đỏ)',
    author: 'Tokiko Kato / Joe Hisaishi',
    tempo: 68,
    desc: 'Khúc piano hoài niệm lãng tử bên bờ biển Adriatic mộng mơ.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.porco}`,
    playlist: 'others',
    melody: [
      ['E4', 1.0], ['G4', 1.0], ['B4', 2.0],
    ],
    chords: [
      [['E3', 'G3', 'B3'], 4.0],
    ]
  },
  {
    id: 'ghibli_earthsea',
    title: "Teru's Song (Teru no Uta)",
    film: 'Tales from Earthsea (Huyền Thoại Xứ Earthsea)',
    author: 'Aoi Teshima / Hiroko Taniyama',
    tempo: 62,
    desc: 'Giai điệu cô độc mà thanh tịnh giữa thảo nguyên lộng gió bát ngát.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.earthsea}`,
    playlist: 'others',
    melody: [
      ['E4', 1.0], ['G4', 1.0], ['B4', 2.0],
    ],
    chords: [
      [['E3', 'G3', 'B3'], 4.0],
    ]
  },
  {
    id: 'ghibli_poppy_hill',
    title: 'Summer of Good-bye (Sayonara no Natsu)',
    film: 'From Up on Poppy Hill (Ngọn Đồi Hoa Hồng Anh)',
    author: 'Aoi Teshima / Koichi Sakata',
    tempo: 74,
    desc: 'Kỷ niệm mùa hè thanh thuần nơi ngọn đồi nhìn ra cảng biển trong xanh.',
    type: 'stream',
    streamUrl: `${ARCHIVE_BASE}${ARCHIVE_FILES.poppy}`,
    playlist: 'others',
    melody: [
      ['C4', 1.0], ['E4', 1.0], ['G4', 2.0],
    ],
    chords: [
      [['C3', 'E3', 'G3'], 4.0],
    ]
  }
];

class GhibliMusicEngine {
  constructor() {
    this.audioElement = null;
    this.ctx = null;
    this.masterGain = null;
    this.crackleNode = null;

    this.isPlaying = false;
    this.currentTrackIndex = 0;
    this.volume = 0.55;
    this.isLoading = false;
    this.activeNodes = [];
    this.playbackTimer = null;
    this.listeners = new Set();

    // New v2 features
    this.shuffle = false;
    this.loopMode = LOOP_MODE.ALL;  // Default: loop all
    this.activePlaylist = 'all';    // Current playlist filter
    this._queue = [];               // Shuffled/filtered track index queue
    this._queuePos = -1;            // Position in queue
    this._history = [];             // History for back navigation
    this._rebuildQueue();
  }

  // ========================
  // PLAYLIST / QUEUE SYSTEM
  // ========================

  /** Get tracks matching current playlist filter */
  getFilteredTracks() {
    if (this.activePlaylist === 'all') return GHIBLI_TRACKS;
    return GHIBLI_TRACKS.filter(t => t.playlist === this.activePlaylist);
  }

  /** Rebuild the play queue based on current playlist + shuffle setting */
  _rebuildQueue(keepCurrent = false) {
    const filtered = this.getFilteredTracks();
    const indices = filtered.map(t => GHIBLI_TRACKS.indexOf(t));

    if (this.shuffle) {
      // Fisher-Yates shuffle, but keep current track at front if playing
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      if (keepCurrent && this.isPlaying) {
        const currentPos = indices.indexOf(this.currentTrackIndex);
        if (currentPos > 0) {
          [indices[0], indices[currentPos]] = [indices[currentPos], indices[0]];
        }
        this._queuePos = 0;
      } else {
        this._queuePos = -1;
      }
    } else {
      this._queuePos = keepCurrent ? indices.indexOf(this.currentTrackIndex) : -1;
    }

    this._queue = indices;
  }

  setPlaylist(playlistId) {
    const valid = PLAYLISTS.some(p => p.id === playlistId);
    if (!valid) return;
    this.activePlaylist = playlistId;
    this._rebuildQueue(false);
    this.notify();
  }

  setShuffle(enabled) {
    this.shuffle = !!enabled;
    this._rebuildQueue(true);
    this.notify();
  }

  toggleShuffle() {
    this.setShuffle(!this.shuffle);
  }

  setLoopMode(mode) {
    if (Object.values(LOOP_MODE).includes(mode)) {
      this.loopMode = mode;
      // Update audio element loop property
      if (this.audioElement) {
        this.audioElement.loop = mode === LOOP_MODE.ONE;
      }
      this.notify();
    }
  }

  cycleLoopMode() {
    const modes = [LOOP_MODE.ALL, LOOP_MODE.ONE, LOOP_MODE.OFF];
    const next = (modes.indexOf(this.loopMode) + 1) % modes.length;
    this.setLoopMode(modes[next]);
  }

  // ========================
  // AUDIO INIT
  // ========================

  initAudioElement() {
    if (typeof window === 'undefined') return null;
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';

      this.audioElement.onplay = () => {
        this.isPlaying = true;
        this.isLoading = false;
        this.notify();
      };

      this.audioElement.onpause = () => {
        if (!this.activeNodes.length) {
          this.isPlaying = false;
        }
        this.notify();
      };

      this.audioElement.onended = () => {
        this._onTrackEnded();
      };

      this.audioElement.onerror = () => {
        this.isLoading = false;
        if (!this.isPlaying) return;
        console.warn('Audio stream error, auto-skipping to next track.');
        // Auto-skip to next track on error instead of stopping
        setTimeout(() => {
          if (this.isPlaying) this.nextTrack();
        }, 1500);
        this.notify();
      };
    }
    this.audioElement.volume = this.volume;
    this.audioElement.loop = this.loopMode === LOOP_MODE.ONE;
    return this.audioElement;
  }

  _onTrackEnded() {
    if (this.loopMode === LOOP_MODE.ONE) {
      // Audio element loop handles this, but just in case
      this.play(this.currentTrackIndex);
      return;
    }

    const hasNext = this._queuePos < this._queue.length - 1;

    if (hasNext) {
      this.nextTrack();
    } else if (this.loopMode === LOOP_MODE.ALL) {
      // Loop back to beginning of queue
      if (this.shuffle) this._rebuildQueue(false);
      this._queuePos = -1;
      this.nextTrack();
    } else {
      // LOOP_MODE.OFF — stop
      this.stop();
    }
  }

  initSynthContext() {
    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return true;
  }

  playPianoNote(ctx, midi, startTime, duration = 1.0, velocity = 0.8) {
    if (!midi || !ctx) return;
    const now = ctx.currentTime;
    const safeStart = Math.max(now + 0.02, startTime);
    const freq = midiToFreq(midi);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, safeStart);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, safeStart);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(2400, freq * 3.5), safeStart);

    const noteGain = ctx.createGain();
    const attack = 0.01;
    const peak = Math.max(0.001, velocity * 0.22);
    const sustain = Math.max(0.0005, peak * 0.4);

    noteGain.gain.setValueAtTime(0.0001, safeStart);
    noteGain.gain.linearRampToValueAtTime(peak, safeStart + attack);
    noteGain.gain.exponentialRampToValueAtTime(sustain, safeStart + 0.2);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + duration + 0.4);

    osc1.connect(noteGain);
    osc2.connect(noteGain);
    noteGain.connect(filter);
    filter.connect(this.masterGain);

    osc1.start(safeStart);
    osc2.start(safeStart);

    const stopTime = safeStart + duration + 0.5;
    osc1.stop(stopTime);
    osc2.stop(stopTime);

    this.activeNodes.push(osc1, osc2, noteGain, filter);
  }

  // ========================
  // PLAYBACK CONTROLS
  // ========================

  play(trackIndexOrId) {
    this.stopPlaybackInternal();

    if (typeof trackIndexOrId === 'number') {
      this.currentTrackIndex = Math.max(0, Math.min(GHIBLI_TRACKS.length - 1, trackIndexOrId));
    } else if (typeof trackIndexOrId === 'string') {
      const idx = GHIBLI_TRACKS.findIndex(t => t.id === trackIndexOrId);
      if (idx !== -1) {
        this.currentTrackIndex = idx;
      }
    }

    // Update queue position
    const posInQueue = this._queue.indexOf(this.currentTrackIndex);
    if (posInQueue !== -1) {
      this._queuePos = posInQueue;
    }

    const track = GHIBLI_TRACKS[this.currentTrackIndex];
    if (!track) return;

    this._history.push(this.currentTrackIndex);
    if (this._history.length > 50) this._history.shift();

    this.isPlaying = true;

    if (track.streamUrl) {
      const audio = this.initAudioElement();
      if (audio) {
        this.isLoading = true;
        audio.src = track.streamUrl;
        audio.volume = this.volume;
        audio.loop = this.loopMode === LOOP_MODE.ONE && !track.isLive;
        audio.play().catch(err => {
          console.warn('Playback notice:', err.message);
          this.isLoading = false;
        });
      }
      this.notify();
      return;
    }

    // Fallback procedural synthesis
    if (!this.initSynthContext()) return;

    const secondsPerBeat = 60 / (track.tempo || 72);
    const startTime = this.ctx.currentTime + 0.1;

    let chordTime = 0;
    if (Array.isArray(track.chords)) {
      track.chords.forEach(([chordNotes, beats]) => {
        const chordStart = startTime + chordTime * secondsPerBeat;
        const dur = beats * secondsPerBeat;
        chordNotes.forEach(noteStr => {
          const midi = parseNote(noteStr);
          if (midi) this.playPianoNote(this.ctx, midi, chordStart, dur, 0.4);
        });
        chordTime += beats;
      });
    }

    let melTime = 0;
    if (Array.isArray(track.melody)) {
      track.melody.forEach(([noteStr, beats]) => {
        const noteStart = startTime + melTime * secondsPerBeat;
        const dur = beats * secondsPerBeat;
        const midi = parseNote(noteStr);
        if (midi) this.playPianoNote(this.ctx, midi, noteStart, dur, 0.8);
        melTime += beats;
      });
    }

    const totalTime = Math.max(chordTime, melTime, 8) * secondsPerBeat;
    const loopDurationMs = (totalTime + 1.0) * 1000;

    this.playbackTimer = setTimeout(() => {
      if (this.isPlaying) {
        this._onTrackEnded();
      }
    }, loopDurationMs);

    this.notify();
  }

  nextTrack() {
    if (this._queue.length === 0) return;
    this._queuePos = (this._queuePos + 1) % this._queue.length;
    this.play(this._queue[this._queuePos]);
  }

  prevTrack() {
    if (this._queue.length === 0) return;
    this._queuePos = (this._queuePos - 1 + this._queue.length) % this._queue.length;
    this.play(this._queue[this._queuePos]);
  }

  stopPlaybackInternal() {
    this.isPlaying = false;
    this.isLoading = false;

    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.removeAttribute('src');
        this.audioElement.load();
      } catch (e) {}
    }

    if (this.crackleNode) {
      try { this.crackleNode.stop(); } catch (e) {}
      this.crackleNode = null;
    }

    this.activeNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  stop() {
    this.stopPlaybackInternal();
    this.notify();
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play(this.currentTrackIndex);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.notify();
  }

  getVolume() {
    return this.volume;
  }

  getCurrentTrack() {
    return GHIBLI_TRACKS[this.currentTrackIndex] || GHIBLI_TRACKS[0];
  }

  getTracks() {
    return GHIBLI_TRACKS;
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTrack: this.getCurrentTrack(),
      volume: this.volume,
      trackIndex: this.currentTrackIndex,
      shuffle: this.shuffle,
      loopMode: this.loopMode,
      activePlaylist: this.activePlaylist,
      queueLength: this._queue.length,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const info = this.getState();
    this.listeners.forEach(fn => {
      try { fn(info); } catch (e) {}
    });
  }
}

export const ghibliMusic = new GhibliMusicEngine();
