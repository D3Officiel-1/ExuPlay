
/**
 * @fileOverview Oracle de la Bibliothèque des Essences v4.0.
 * Stocke les chaînes d'emojis bruts et les outils de parsing pour le Clavier du Sanctuaire.
 */

/**
 * Convertit une chaîne brute d'emojis en un tableau d'objets avec leurs codes Hex pour le rendu 3D.
 * Gère les séquences complexes (ZWJ) et purifie les sélecteurs de variante.
 */
export function parseEmojiString(raw: string) {
  // Regex robuste pour capturer les emojis simples et les séquences complexes (ZWJ, modificateurs)
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|[\u2600-\u27BF]\uFE0F?|[\uD83C-\uD83E][\uDC00-\uDFFF](?:\u200D[\uD83C-\uD83E][\uDC00-\uDFFF])*)/gu;
  const matches = raw.match(emojiRegex) || [];
  const unique = Array.from(new Set(matches));
  
  return unique.map(emoji => ({
    char: emoji,
    hex: Array.from(emoji)
      .map(c => c.codePointAt(0)?.toString(16))
      .filter(h => h && h !== 'fe0f')
      .join('-')
  }));
}

// --- LES ARCHIVES DE L'ORACLE ---

// Catégorie : Emoji et personne (Intégralité fournie)
export const RAW_EMOJI_PEOPLE = "😀😃😄😁😆🥹😅😂🤣🥲☺️😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳🙂‍↕️😏😒🙂‍↔️😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😶‍🌫️😱😨😰😥😓🤗🤔🫣🤭🫢🫡🤫🫠🤥😶🫥😐🫤😑🫨😬🙄😯😦😧😮😲🥱🫩😴🤤😪😮‍💨😵😵‍💫🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾🫶🤲👐🙌👏🤝👍👎👊✊🤛🤜🫷🫸🤞✌️🫰🤟🤘👌🤌🤏🫳🫴👈👉👆👇☝️✋🤚🖐️🖖👋🤙🫲🫱💪🦾🖕✍️🙏🫵🦶🦵🦿💄💋👄🫦🦷👅👂🦻👃🫆👣👁️👀🫀🫁🧠🗣️👤👥🫂👶👧🧒👦👩🧑👨👩‍🦱🧑‍🦱👨‍🦱👩‍🦰🧑‍🦰👨‍🦰👱‍♀️👱👱‍♂️👩‍🦳🧑‍🦳👨‍🦳👩‍🦲🧑‍🦲👨‍🦲🧔‍♀️🧔🧔‍♂️👵🧓👴👲👳‍♀️👳👳‍♂️🧕👮‍♀️👮👮‍♂️👷‍♀️👷👷‍♂️💂‍♀️💂🏻💂‍♂️🕵️‍♀️🕵️🕵️‍♂️👩‍⚕️🧑‍⚕️👨‍⚕️👩‍🌾🧑‍🌾👨‍🌾👩‍🍳🧑‍🍳👨‍🍳👩‍🎓🧑‍🎓👨‍🎓👩‍🎤🧑‍🎤👨‍🎤👩‍🏫🧑‍🏫👨‍🏫👩‍🏭🧑‍🏭👨‍🏭👩‍💻🧑‍💻👨‍💻👩‍💼🧑‍💼👨‍💼👩‍🔧🧑‍🔧👨‍🔧👩‍🔬🧑‍🔬👨‍🔬👩‍🎨🧑‍🎨👨‍🎨👩‍🚒🧑‍🚒👨‍🚒👩‍✈️🧑‍✈️👨‍✈️👩‍🚀🧑‍🚀👨‍🚀👩‍⚖️🧑‍⚖️👨‍⚖️👰‍♀️👰👰‍♂️🤵‍♀️🤵🤵‍♂️👸🫅🤴🥷🦸‍♀️🦸🦸‍♂️🦹‍♀️🦹🦹‍♂️🤶🧑‍🎄🎅🧙‍♀️🧙🧙‍♂️🧝‍♀️🧝🧝‍♂️🧌🧛‍♀️🧛🧛‍♂️🧟‍♀️🧟🧟‍♂️🧞‍♀️🧞🧞‍♂️🧜‍♀️🧜🧜‍♂️🧚‍♀️🧚🧚‍♂️👼🤰🫄🫃🤱👩‍🍼🧑‍🍼👨‍🍼🙇‍♀️🙇🙇‍♂️💁‍♀️💁💁‍♂️🙅‍♀️🙅🙅‍♂️🙆‍♀️🙆🙆‍♂️🙋‍♀️🙋🙋‍♂️🧏‍♀️🧏🧏‍♂️🤦‍♀️🤦🤦‍♂️🤷‍♀️🤷🤷‍♂️🙎‍♀️🙎🙎‍♂️🙍‍♀️🙍🙍‍♂️💇‍♀️💇💇‍♂️💆‍♀️💆💆‍♂️🧖‍♀️🧖🧖‍♂️💅🤳💃🕺👯‍♀️👯👯‍♂️🕴️👩‍🦽🧑‍🦽👨‍🦽👩‍🦼🧑‍🦼👨‍🦼🚶‍♀️🚶🚶‍♂️👩‍🦯🧑‍🦯👨‍🦯🧎‍♀️🧎🧎‍♂️🏃‍♀️🏃🏃‍♂️🧍‍♀️🧍🧍‍♂️👫👭👬👩‍❤️‍👨👩‍❤️‍👩💑👨‍❤️‍👨👩‍❤️‍💋‍👨👩‍❤️‍💋‍👩💏👨‍❤️‍💋‍👨🪢🧶🧵🪡🧥🥼🦺👚👕👖🩲🩳👔👗👙🩱👘🥻🩴🥿👠👡👢👞👟🥾🧦🧤🧣🎩🧢👒🎓⛑️🪖👑💍👝👛👜💼🎒🧳👓🕶️🥽🌂";

// Catégorie : Animaux et Nature (Intégralité fournie)
export const RAW_NATURE = "🐶🐱🐭🐹🐰🦊🐻🐼🐻‍❄️🐨🐯🦁🐮🐷🐽🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🐣🐥🪿🦆🐦‍⬛🦅🦉🦇🐺🐗🐴🦄🫎🐝🪱🐛🦋🐌🐞🐜🪰🪲🪳🦟🦗🕷️🕸️🦂🐢🐍🦎🦖🦕🐙🦑🪼🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🦭🐊🐅🐆🦓🦍🦧🦣🐘🦛🦏🐪🐫🦒🦘🦬🐃🐂🐄🫏🐎🐖🐏🐑🦙🐐🦌🐕🐩🦮🐕‍🦺🐈🐈‍⬛🪶🪽🐓🦃🦤🦚🦜🦢🦩🕊️🐇🦝🦨🦡🦫🦦🦥🐁🐀🐿️🦔🐾🐉🐲🐦‍🔥🌵🎄🌲🌳🌴🪾🪵🌱🌿☘️🍀🎍🪴🎋🍃🍂🍁🪺🪹🍄🍄‍🟫🐚🪸🪨🌾💐🌷🌹🥀🪻🪷🌺🌸🌼🌻🌞🌝🌛🌜🌚🌕🌖🌗🌘🌑🌒🌓🌔🌙🌎🌍🌏🪐💫⭐🌟✨⚡☄️💥🔥🌪️🌈☀️🌤️⛅🌥️☁️🌦️🌧️⛈️🌩️🌨️❄️☃️⛄🌬️💨💧💦🫧☔☂️🌊🌫️";

export const RAW_FOOD = "🍎🍌🍉🍓🥑🍕🍔🍟 taco 🌮 sushi 🍣🍦🍰 donut 🍩 popcorn 🍿 🍺🍷☕ croissant 🥐 pretzel 🥨 cheese 🧀 egg 🥚🍭 bento 🍱 onigiri 🍙 ramen 🍜 curry 🍛";

export const RAW_ACTIVITIES = "⚽🏀🏈🎾🥊🎮🎯🎲🎸🎨🎬🎤🏆🥇🛹🚲 puzzle 🧩 bowling 🎳 saxophone 🎷 violin 🎻 kite 🪁 billiard 🎱 controller 🎮 joystick 🕹️ theater 🎭 ticket 🎟️";

export const RAW_OBJECTS = "💡📱💻📷 telescope 🔭 diamond 💎 shield 🛡️ swords ⚔️ key 🗝️ pill 💊 test_tube 🧪 bricks 🧱 balloon 🎈 gift 🎁 envelope ✉️ dollar 💵 credit_card 💳";

export const RAW_SYMBOLS = "❤️🧡💛💚💙💜🖤✨⚡❄️ atom ⚛️ infinity ♾️ yin_yang ☯️ trident 🔱 check ✅ cross ❌ nazar 🧿 bell 🔔";
