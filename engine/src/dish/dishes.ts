/**
 * Dish knowledge base: the typical recipe of each dish and how often each
 * ingredient carries gluten. This describes the common version of a dish,
 * not any particular kitchen's, so dish verdicts never say "safe".
 *
 * Likelihood: always = a gluten ingredient is intrinsic to the dish;
 * often = most versions use one; sometimes = some versions or kitchens do;
 * none = not a gluten source.
 *
 * Aliases include native-script names so a vision model's output or a typed
 * menu name will match. Review entries with the person who has coeliac disease;
 * their experience outranks this file.
 */
import type { DishEntry, DishIngredient, GlutenLikelihood } from '../types.ts';

type I = [name: string, gluten: GlutenLikelihood, source?: string, note?: string];

function d(id: string, name: string, aliases: string[], cuisine: string, ing: I[], note?: string): DishEntry {
  return {
    id, name, aliases, cuisine, note,
    ingredients: ing.map(([n, g, s, nt]): DishIngredient => ({ name: n, gluten: g, source: s, note: nt })),
  };
}

export const DISHES: DishEntry[] = [
  // ---------------------------------------------------------------- Japanese
  d('ramen', 'Ramen', ['ラーメン', 'shoyu ramen', 'tonkotsu ramen', 'miso ramen', '拉面'], 'Japanese', [
    ['wheat noodles', 'always', 'wheat_noodles'], ['broth with soy sauce or miso tare', 'often', 'soy_sauce'], ['chashu pork', 'often', 'marinade'], ['egg, spring onion, nori', 'none'],
  ]),
  d('udon', 'Udon', ['うどん', 'kitsune udon', 'tempura udon'], 'Japanese', [
    ['wheat noodles', 'always', 'wheat_noodles'], ['dashi broth with soy sauce', 'always', 'soy_sauce'],
  ]),
  d('soba', 'Soba', ['そば', '蕎麦', 'zaru soba'], 'Japanese', [
    ['buckwheat noodles (most also contain wheat)', 'often', 'wheat_noodles', '100% buckwheat (juwari) soba exists but is uncommon.'], ['tsuyu dipping sauce (soy sauce)', 'always', 'soy_sauce'],
  ]),
  d('sushi', 'Sushi', ['寿司', 'すし', 'maki', 'nigiri', 'sushi roll', 'hand roll', 'temaki'], 'Japanese', [
    ['sushi rice with rice vinegar', 'none'], ['raw fish, vegetables', 'none'], ['soy sauce for dipping', 'often', 'soy_sauce', 'Can be swapped for your own gluten-free tamari.'],
    ['imitation crab in some rolls', 'sometimes', 'imitation_crab'], ['tempura or crunchy bits in some rolls', 'sometimes', 'batter_crumb'], ['eel or teriyaki sauce', 'sometimes', 'soy_sauce'],
  ]),
  d('sashimi', 'Sashimi', ['刺身', 'さしみ'], 'Japanese', [
    ['raw fish', 'none'], ['soy sauce for dipping', 'often', 'soy_sauce'], ['wasabi, ginger', 'none'],
  ]),
  d('tempura', 'Tempura', ['天ぷら', 'てんぷら'], 'Japanese', [['wheat flour batter', 'always', 'batter_crumb'], ['tentsuyu dipping sauce', 'always', 'soy_sauce'], ['shared fryer', 'often', 'shared_fryer']]),
  d('japanese-curry', 'Japanese curry', ['カレー', 'カレーライス', 'kare raisu', 'katsu curry', 'curry rice'], 'Japanese', [
    ['curry roux (wheat flour)', 'always', 'flour_thickener'], ['rice', 'none'], ['katsu cutlet if included', 'sometimes', 'batter_crumb'],
  ]),
  d('tonkatsu', 'Tonkatsu', ['とんかつ', '豚カツ', 'katsu', 'chicken katsu'], 'Japanese', [['panko crumb', 'always', 'batter_crumb'], ['tonkatsu sauce', 'always', 'oyster_hoisin']]),
  d('gyoza', 'Gyoza', ['餃子', 'ぎょうざ', 'potstickers'], 'Japanese', [['wheat wrapper', 'always', 'wrapper'], ['dipping sauce (soy)', 'always', 'soy_sauce']]),
  d('okonomiyaki', 'Okonomiyaki', ['お好み焼き'], 'Japanese', [['wheat flour batter', 'always', 'wheat_grain'], ['okonomiyaki sauce', 'always', 'oyster_hoisin']]),
  d('takoyaki', 'Takoyaki', ['たこ焼き'], 'Japanese', [['wheat flour batter', 'always', 'wheat_grain'], ['takoyaki sauce', 'always', 'oyster_hoisin']]),
  d('teriyaki', 'Teriyaki chicken', ['照り焼き', 'teriyaki', 'chicken teriyaki', 'salmon teriyaki'], 'Japanese', [['teriyaki sauce (soy sauce)', 'always', 'soy_sauce'], ['chicken or fish', 'none'], ['rice', 'none']]),
  d('yakitori', 'Yakitori', ['焼き鳥', 'やきとり'], 'Japanese', [['chicken skewers', 'none'], ['tare glaze (soy sauce)', 'often', 'soy_sauce', 'Salt-seasoned (shio) skewers avoid the tare.']]),
  d('miso-soup', 'Miso soup', ['味噌汁', 'みそ汁'], 'Japanese', [['dashi', 'none'], ['miso paste', 'sometimes', 'bean_paste', 'Barley (mugi) miso contains gluten.'], ['tofu, seaweed', 'none']]),
  d('onigiri', 'Onigiri', ['おにぎり', 'rice ball'], 'Japanese', [['rice, nori', 'none'], ['filling or seasoning with soy sauce', 'sometimes', 'soy_sauce']]),
  d('edamame', 'Edamame', ['枝豆'], 'Japanese', [['soybeans, salt', 'none']]),

  // ---------------------------------------------------------------- Chinese
  d('fried-rice', 'Fried rice', ['炒饭', '炒飯', 'egg fried rice', 'yangzhou fried rice', 'special fried rice', 'cơm chiên', 'khao pad', 'ข้าวผัด'], 'Chinese / Asian', [
    ['rice, egg, vegetables', 'none'], ['soy sauce', 'often', 'soy_sauce'], ['oyster sauce', 'sometimes', 'oyster_hoisin'],
  ]),
  d('dumplings', 'Dumplings (jiaozi)', ['饺子', '餃子', 'jiaozi', 'xiao long bao', '小笼包', 'wonton', '馄饨', 'dim sum dumplings', 'mandu', '만두', 'momo'], 'Chinese', [
    ['wheat wrapper', 'always', 'wrapper'], ['dipping sauce (soy, vinegar)', 'often', 'soy_sauce'],
  ]),
  d('har-gow', 'Har gow', ['虾饺', '蝦餃', 'shrimp dumplings', 'har gau'], 'Chinese', [['wrapper of wheat starch and tapioca', 'always', 'wrapper', 'Wheat starch is used; it is not certified gluten-free.']]),
  d('siu-mai', 'Siu mai', ['烧卖', '燒賣', 'shumai'], 'Chinese', [['wheat wrapper', 'always', 'wrapper'], ['filling with soy sauce', 'often', 'soy_sauce']]),
  d('spring-rolls', 'Spring rolls (fried)', ['春卷', 'egg rolls', 'chả giò', 'cha gio', 'lumpia', 'popiah'], 'Chinese / Asian', [
    ['wrapper (wheat in most Chinese styles; rice paper in Vietnamese)', 'often', 'wrapper'], ['shared fryer', 'often', 'shared_fryer'], ['filling seasoning', 'sometimes', 'soy_sauce'],
  ]),
  d('kung-pao', 'Kung pao chicken', ['宫保鸡丁', '宮保雞丁', 'kung po chicken'], 'Chinese', [['chicken, peanuts, chillies', 'none'], ['soy sauce', 'always', 'soy_sauce'], ['Chinkiang vinegar (often wheat-based)', 'often', 'soy_sauce']]),
  d('sweet-sour', 'Sweet and sour pork/chicken', ['咕噜肉', '咕嚕肉', 'sweet and sour pork', 'sweet and sour chicken'], 'Chinese', [['battered meat', 'always', 'batter_crumb'], ['sweet and sour sauce', 'sometimes', 'oyster_hoisin']]),
  d('mapo-tofu', 'Mapo tofu', ['麻婆豆腐'], 'Chinese', [['tofu, minced pork', 'none'], ['doubanjiang (broad bean paste, often with wheat)', 'often', 'bean_paste'], ['soy sauce', 'often', 'soy_sauce']]),
  d('char-siu', 'Char siu (BBQ pork)', ['叉烧', '叉燒', 'chinese bbq pork'], 'Chinese', [['pork', 'none'], ['marinade with hoisin and soy sauce', 'always', 'oyster_hoisin']]),
  d('peking-duck', 'Peking duck', ['北京烤鸭', '北京烤鴨', 'roast duck pancakes'], 'Chinese', [['duck', 'none'], ['wheat pancakes', 'always', 'wrapper'], ['hoisin sauce', 'always', 'oyster_hoisin']]),
  d('congee', 'Congee', ['粥', 'jook', 'juk', 'cháo', 'chao', 'โจ๊ก'], 'Chinese / Asian', [['rice porridge', 'none'], ['soy sauce seasoning', 'sometimes', 'soy_sauce'], ['youtiao fried dough on the side', 'sometimes', 'bread']]),
  d('chow-mein', 'Chow mein / lo mein', ['炒面', '炒麵', 'lo mein', '捞面'], 'Chinese', [['wheat egg noodles', 'always', 'wheat_noodles'], ['soy and oyster sauce', 'always', 'soy_sauce']]),

  // ---------------------------------------------------------------- Korean
  d('bibimbap', 'Bibimbap', ['비빔밥'], 'Korean', [['rice, vegetables, egg', 'none'], ['gochujang (usually contains wheat or barley)', 'often', 'bean_paste'], ['seasoned meat (soy sauce)', 'often', 'marinade']]),
  d('bulgogi', 'Bulgogi / Korean BBQ', ['불고기', 'korean bbq', 'galbi', '갈비'], 'Korean', [['beef', 'none'], ['soy sauce marinade', 'always', 'marinade'], ['ssamjang dipping paste', 'often', 'bean_paste']]),
  d('japchae', 'Japchae', ['잡채'], 'Korean', [['sweet potato glass noodles', 'none'], ['soy sauce', 'always', 'soy_sauce']]),
  d('tteokbokki', 'Tteokbokki', ['떡볶이'], 'Korean', [['rice cakes (some are wheat-based)', 'sometimes', 'wheat_grain', 'Wheat tteok (밀떡) is common in street food.'], ['gochujang sauce', 'often', 'bean_paste'], ['fish cakes', 'often', 'wheat_grain']]),
  d('kimchi', 'Kimchi', ['김치'], 'Korean', [['fermented cabbage, chilli', 'none'], ['paste binder (usually rice, sometimes wheat flour)', 'sometimes', 'flour_thickener']]),
  d('korean-fried-chicken', 'Korean fried chicken', ['치킨', 'yangnyeom chicken', '양념치킨'], 'Korean', [['flour or starch batter', 'always', 'batter_crumb'], ['sauce with soy or gochujang', 'often', 'soy_sauce'], ['shared fryer', 'often', 'shared_fryer']]),

  // ---------------------------------------------------------------- Thai
  d('pad-thai', 'Pad thai', ['ผัดไทย', 'phad thai'], 'Thai', [['rice noodles', 'none'], ['tamarind, fish sauce', 'sometimes', 'fish_sauce'], ['soy sauce or oyster sauce', 'often', 'oyster_hoisin']]),
  d('pad-see-ew', 'Pad see ew', ['ผัดซีอิ๊ว', 'pad siew'], 'Thai', [['wide rice noodles', 'none'], ['dark and light soy sauce', 'always', 'soy_sauce']]),
  d('green-curry', 'Thai green curry', ['แกงเขียวหวาน', 'gaeng keow wan', 'green curry', 'red curry', 'แกงแดง', 'thai curry'], 'Thai', [
    ['curry paste', 'sometimes', 'curry_paste'], ['coconut milk', 'none'], ['fish sauce', 'sometimes', 'fish_sauce'], ['jasmine rice', 'none'],
  ]),
  d('massaman', 'Massaman curry', ['แกงมัสมั่น', 'massaman'], 'Thai', [['curry paste', 'sometimes', 'curry_paste'], ['coconut milk, potato, peanuts', 'none'], ['fish sauce', 'sometimes', 'fish_sauce']]),
  d('tom-yum', 'Tom yum', ['ต้มยำ', 'tom yam'], 'Thai', [['broth, lemongrass, chilli', 'none'], ['chilli paste (nam prik pao) may contain soy sauce', 'sometimes', 'curry_paste'], ['fish sauce', 'sometimes', 'fish_sauce']]),
  d('som-tam', 'Som tam (papaya salad)', ['ส้มตำ', 'papaya salad'], 'Thai', [['green papaya, chilli, lime', 'none'], ['fish sauce', 'sometimes', 'fish_sauce']]),
  d('satay', 'Satay', ['สะเต๊ะ', 'sate', 'saté'], 'Thai / Indonesian', [['skewered meat', 'none'], ['marinade', 'sometimes', 'marinade'], ['peanut sauce with soy sauce or kecap', 'often', 'soy_sauce']]),
  d('mango-sticky-rice', 'Mango sticky rice', ['ข้าวเหนียวมะม่วง'], 'Thai', [['glutinous rice (no gluten despite the name)', 'none'], ['coconut cream, mango', 'none']]),

  // ---------------------------------------------------------------- Vietnamese
  d('pho', 'Pho', ['phở', 'pho bo', 'pho ga'], 'Vietnamese', [['rice noodles', 'none'], ['beef or chicken broth', 'sometimes', 'stock'], ['hoisin sauce at the table', 'often', 'oyster_hoisin', 'Skip the hoisin.']]),
  d('banh-mi', 'Banh mi', ['bánh mì'], 'Vietnamese', [['wheat baguette', 'always', 'bread'], ['pâté, meats', 'sometimes', 'sausage'], ['Maggi or soy seasoning', 'often', 'soy_sauce']]),
  d('fresh-rolls', 'Fresh rice paper rolls', ['gỏi cuốn', 'goi cuon', 'summer rolls', 'rice paper rolls'], 'Vietnamese', [['rice paper, rice vermicelli', 'none'], ['prawns, herbs', 'none'], ['hoisin peanut dipping sauce', 'often', 'oyster_hoisin']]),
  d('bun-cha', 'Bun cha', ['bún chả'], 'Vietnamese', [['rice vermicelli', 'none'], ['grilled pork marinade', 'sometimes', 'marinade'], ['fish sauce dipping sauce', 'sometimes', 'fish_sauce']]),

  // ---------------------------------------------------------------- Indian
  d('butter-chicken', 'Butter chicken', ['murgh makhani', 'chicken makhani', 'tikka masala', 'chicken tikka masala'], 'Indian', [
    ['chicken, tomato, cream, butter', 'none'], ['sauce sometimes thickened with flour', 'sometimes', 'flour_thickener'], ['spice blend', 'sometimes', 'spice_mix'], ['naan served alongside', 'often', 'bread'],
  ]),
  d('dal', 'Dal', ['daal', 'dhal', 'dal tadka', 'dal makhani'], 'Indian', [['lentils', 'none'], ['tempering with asafoetida (hing)', 'sometimes', 'spice_mix']]),
  d('biryani', 'Biryani', ['biriyani', 'बिरयानी'], 'Indian', [['basmati rice, meat, spices', 'none'], ['spice blend', 'sometimes', 'spice_mix'], ['fried onions sometimes dusted in flour', 'sometimes', 'toppings']]),
  d('naan', 'Naan / roti / chapati', ['naan', 'roti', 'chapati', 'paratha', 'puri', 'नान', 'रोटी'], 'Indian', [['wheat flour (atta or maida)', 'always', 'bread']]),
  d('samosa', 'Samosa', ['samoosa', 'समोसा'], 'Indian', [['wheat pastry', 'always', 'wrapper'], ['shared fryer', 'often', 'shared_fryer']]),
  d('pakora', 'Pakora / bhaji', ['pakoda', 'onion bhaji', 'bhajia'], 'Indian', [['chickpea (besan) batter, sometimes with wheat flour', 'sometimes', 'batter_crumb'], ['shared fryer', 'often', 'shared_fryer'], ['spice blend', 'sometimes', 'spice_mix']]),
  d('dosa', 'Dosa', ['दोसा', 'masala dosa', 'rava dosa'], 'Indian', [['rice and urad dal batter', 'none'], ['some mixes add wheat; rava dosa uses semolina', 'sometimes', 'wheat_grain'], ['sambar with asafoetida', 'sometimes', 'spice_mix']]),
  d('tandoori-chicken', 'Tandoori chicken', ['tandoori', 'chicken tikka'], 'Indian', [['chicken, yoghurt, spices', 'none'], ['spice blend', 'sometimes', 'spice_mix']]),
  d('pani-puri', 'Pani puri', ['golgappa', 'puchka', 'gol gappa'], 'Indian', [['puri shells (semolina or wheat)', 'always', 'wheat_grain']]),

  // ---------------------------------------------------------------- Indonesian / Malaysian
  d('nasi-goreng', 'Nasi goreng', ['nasi goreng'], 'Indonesian / Malaysian', [['rice', 'none'], ['kecap manis (sweet soy sauce, usually with wheat)', 'often', 'soy_sauce'], ['prawn crackers', 'sometimes', 'toppings']]),
  d('mie-goreng', 'Mie goreng', ['mi goreng', 'mee goreng', 'bakmi goreng'], 'Indonesian', [['wheat egg noodles', 'always', 'wheat_noodles'], ['kecap manis', 'often', 'soy_sauce']]),
  d('rendang', 'Rendang', ['beef rendang'], 'Indonesian / Malaysian', [['beef, coconut, spices', 'none'], ['spice paste', 'sometimes', 'curry_paste']]),
  d('gado-gado', 'Gado-gado', ['gado gado'], 'Indonesian', [['vegetables, tofu, egg', 'none'], ['peanut sauce with kecap manis', 'often', 'soy_sauce'], ['crackers on top', 'sometimes', 'toppings']]),
  d('laksa', 'Laksa', ['curry laksa', 'assam laksa'], 'Malaysian / Singaporean', [['noodles (rice vermicelli or wheat egg noodles)', 'often', 'wheat_noodles'], ['laksa paste', 'sometimes', 'curry_paste'], ['fish cake or tofu puffs', 'sometimes', 'wheat_grain']]),
  d('nasi-lemak', 'Nasi lemak', ['nasi lemak'], 'Malaysian', [['coconut rice, egg, peanuts, anchovies', 'none'], ['sambal', 'sometimes', 'curry_paste'], ['fried chicken if included', 'sometimes', 'batter_crumb']]),

  // ---------------------------------------------------------------- Italian
  d('pizza', 'Pizza', ['pizza margherita', 'pizza'], 'Italian', [['wheat dough', 'always', 'bread'], ['tomato, cheese', 'none'], ['toppings like sausage', 'sometimes', 'sausage']]),
  d('pasta', 'Pasta dishes', ['spaghetti', 'penne', 'fettuccine', 'carbonara', 'bolognese', 'lasagne', 'lasagna', 'ravioli', 'tortellini', 'mac and cheese', 'macaroni'], 'Italian', [
    ['wheat pasta', 'always', 'pasta'], ['sauce', 'sometimes', 'flour_thickener'],
  ]),
  d('gnocchi', 'Gnocchi', ['gnocchi'], 'Italian', [['potato with wheat flour', 'always', 'wheat_grain']]),
  d('risotto', 'Risotto', ['risotto'], 'Italian', [['arborio rice, butter, parmesan', 'none'], ['stock', 'sometimes', 'stock']]),
  d('tiramisu', 'Tiramisu', ['tiramisù'], 'Italian', [['savoiardi biscuits', 'always', 'biscuit_cake'], ['mascarpone, coffee', 'none']]),
  d('bruschetta', 'Bruschetta', ['bruschetta'], 'Italian', [['toasted bread', 'always', 'bread'], ['tomato, basil', 'none']]),
  d('polenta', 'Polenta', ['polenta'], 'Italian', [['cornmeal', 'none'], ['stock', 'sometimes', 'stock']]),

  // ---------------------------------------------------------------- Mexican
  d('tacos', 'Tacos', ['taco', 'tacos al pastor', 'fish tacos'], 'Mexican', [['tortillas (corn or flour)', 'sometimes', 'tortilla'], ['seasoning mix', 'sometimes', 'spice_mix'], ['battered fish if included', 'sometimes', 'batter_crumb']]),
  d('burrito', 'Burrito', ['burrito', 'burrito bowl'], 'Mexican', [['flour tortilla', 'always', 'tortilla', 'A burrito bowl skips the tortilla.'], ['rice, beans, meat', 'none'], ['seasoning', 'sometimes', 'spice_mix']]),
  d('quesadilla', 'Quesadilla', ['quesadillas'], 'Mexican', [['tortilla (usually flour)', 'often', 'tortilla'], ['cheese', 'none']]),
  d('nachos', 'Nachos', ['nachos'], 'Mexican', [['corn chips', 'none'], ['shared fryer if made in-house', 'sometimes', 'shared_fryer'], ['seasoning or cheese sauce', 'sometimes', 'flour_thickener']]),
  d('enchiladas', 'Enchiladas', ['enchilada'], 'Mexican', [['corn tortillas', 'sometimes', 'tortilla'], ['sauce sometimes thickened with flour', 'sometimes', 'flour_thickener']]),
  d('guacamole', 'Guacamole', ['guac'], 'Mexican', [['avocado, lime, onion', 'none']]),
  d('churros', 'Churros', ['churro'], 'Mexican / Spanish', [['wheat dough', 'always', 'wheat_grain'], ['shared fryer', 'often', 'shared_fryer']]),

  // ---------------------------------------------------------------- French / European
  d('croissant', 'Croissant / pastries', ['croissant', 'pain au chocolat', 'danish', 'viennoiserie'], 'French', [['wheat pastry', 'always', 'wrapper']]),
  d('quiche', 'Quiche', ['quiche lorraine'], 'French', [['wheat pastry', 'always', 'wrapper'], ['egg, cream, filling', 'none']]),
  d('crepes', 'Crêpes', ['crepe', 'crêpe', 'crepes'], 'French', [['wheat flour batter', 'always', 'wheat_grain']]),
  d('galette', 'Galette (buckwheat crêpe)', ['galette bretonne', 'galette de sarrasin', 'buckwheat crepe'], 'French', [['buckwheat flour, sometimes with wheat flour added', 'sometimes', 'wheat_grain'], ['cooked on a griddle shared with wheat crêpes', 'often', 'cross_contact']]),
  d('french-onion-soup', 'French onion soup', ['soupe à l\'oignon', 'onion soup'], 'French', [['bread crouton on top', 'always', 'bread'], ['broth sometimes thickened with flour', 'sometimes', 'flour_thickener']]),
  d('ratatouille', 'Ratatouille', ['ratatouille'], 'French', [['vegetables, olive oil, herbs', 'none']]),
  d('steak-frites', 'Steak frites', ['steak and chips', 'steak frites', 'steak'], 'French / Western', [['steak', 'none'], ['fries', 'sometimes', 'shared_fryer'], ['sauce or gravy', 'sometimes', 'flour_thickener']]),
  d('paella', 'Paella', ['paella'], 'Spanish', [['rice, saffron, seafood or chicken', 'none'], ['stock', 'sometimes', 'stock']]),

  // ---------------------------------------------------------------- Australian / British / North American
  d('fish-and-chips', 'Fish and chips', ['fish n chips', 'battered fish'], 'Australian / British', [['battered fish', 'always', 'batter_crumb'], ['chips', 'often', 'shared_fryer']]),
  d('chips', 'Chips / fries', ['fries', 'french fries', 'hot chips', 'wedges', 'potato wedges'], 'Western', [['potatoes', 'none'], ['coating on some fries', 'sometimes', 'batter_crumb'], ['shared fryer', 'often', 'shared_fryer'], ['chicken salt or seasoning', 'sometimes', 'spice_mix']]),
  d('burger', 'Burger', ['hamburger', 'cheeseburger', 'beef burger'], 'Western', [['wheat bun', 'always', 'bread'], ['patty (may contain breadcrumbs)', 'sometimes', 'sausage'], ['sauces', 'sometimes', 'dressing']]),
  d('hot-dog', 'Hot dog', ['hotdog', 'sausage sizzle'], 'Western', [['wheat bun or bread', 'always', 'bread'], ['sausage', 'often', 'sausage']]),
  d('meat-pie', 'Meat pie', ['pie', 'pie and sauce', 'steak pie', 'sausage roll', 'pasty', 'tourtière', 'tourtiere'], 'Australian / British / Canadian', [['wheat pastry', 'always', 'wrapper'], ['gravy filling', 'often', 'flour_thickener']]),
  d('caesar-salad', 'Caesar salad', ['caesar'], 'Western', [['lettuce, parmesan', 'none'], ['croutons', 'always', 'toppings'], ['dressing', 'sometimes', 'dressing']]),
  d('salad', 'Garden salad', ['salad', 'green salad', 'side salad'], 'Western', [['leaves, vegetables', 'none'], ['dressing', 'sometimes', 'dressing'], ['croutons or crunchy toppings', 'sometimes', 'toppings']]),
  d('roast', 'Roast dinner', ['roast chicken', 'roast beef', 'sunday roast', 'roast lamb'], 'Australian / British', [['roast meat and vegetables', 'none'], ['gravy', 'often', 'flour_thickener'], ['Yorkshire pudding or stuffing', 'sometimes', 'wheat_grain']]),
  d('omelette', 'Omelette', ['omelet', 'scrambled eggs', 'eggs'], 'Western', [['eggs, butter', 'none'], ['some kitchens add pancake batter for fluffiness', 'sometimes', 'wheat_grain']]),
  d('pavlova', 'Pavlova', ['pav'], 'Australian / NZ', [['meringue, cream, fruit', 'none'], ['cornflour in meringue (check it is not wheaten cornflour)', 'sometimes', 'wheat_grain']]),
  d('anzac-biscuit', 'Anzac biscuits', ['anzac'], 'Australian / NZ', [['rolled oats', 'always', 'oats'], ['wheat flour', 'always', 'biscuit_cake']]),
  d('lamington', 'Lamington', ['lamingtons'], 'Australian', [['sponge cake', 'always', 'biscuit_cake'], ['chocolate, coconut', 'none']]),
  d('poutine', 'Poutine', ['poutine'], 'Canadian', [['fries', 'often', 'shared_fryer'], ['cheese curds', 'none'], ['gravy (usually wheat-thickened or from a mix)', 'often', 'flour_thickener']]),
  d('butter-tart', 'Butter tart', ['butter tarts'], 'Canadian', [['wheat pastry', 'always', 'wrapper']]),
  d('nanaimo-bar', 'Nanaimo bar', ['nanaimo bars'], 'Canadian', [['graham or biscuit crumb base', 'always', 'biscuit_cake']]),
  d('beavertail', 'BeaverTails', ['beaver tail', 'beavertails'], 'Canadian', [['fried wheat dough', 'always', 'wheat_grain']]),
  d('pancakes', 'Pancakes / waffles', ['pancake', 'waffles', 'waffle', 'flapjacks'], 'Western', [['wheat flour batter', 'always', 'wheat_grain']]),
  d('porridge', 'Porridge', ['oatmeal', 'oats porridge'], 'Western', [['oats', 'always', 'oats']]),
  d('beer', 'Beer', ['lager', 'ale', 'ビール', '맥주', 'เบียร์', 'bia'], 'Drink', [['barley malt', 'always', 'beer_malt', 'Only beers labelled gluten-free are made from gluten-free grains.']]),
  d('sandwich', 'Sandwich / wrap', ['sandwich', 'wrap', 'sub', 'toastie', 'panini'], 'Western', [['wheat bread or wrap', 'always', 'bread'], ['fillings', 'sometimes', 'sausage']]),
];
