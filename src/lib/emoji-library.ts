
/**
 * @fileOverview Oracle de la Bibliothèque des Essences.
 * Stocke les chaînes d'emojis bruts et les outils de parsing pour alléger le Clavier du Sanctuaire.
 */

/**
 * Convertit une chaîne brute d'emojis en un tableau d'objets avec leurs codes Hex pour le rendu 3D.
 */
export function parseEmojiString(raw: string) {
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

// --- LES ARCHIVES DE L'ORACLE (CATÉGORIE PERSONNES COMPLÈTE) ---
export const RAW_EMOJI_PEOPLE = "😀😃😄😁😆🥹😅😂🤣🥲☺️😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳🙂‍↕️😏😒🙂‍↔️😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😶‍🌫️😱😨😰😥😓🤗🤔🫣🤭🫢🫡🤫🫠🤥😶🫥😐🫤😑🫨😬🙄😯😦😧😮😲🥱🫩😴🤤😪😮‍💨😵😵‍💫🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾🫶🤲👐🙌👏🤝👍👎👊✊🤛🤜🫷🫸🤞✌️🫰🤟🤘👌🤌🤏🫳🫴👈👉👆👇☝️✋🤚🖐️🖖👋🤙🫲🫱💪🦾🖕✍️🙏🫵🦶🦵🦿💄💋👄🫦🦷👅👂🦻👃🫆👣👁️👀🫀🫁🧠🗣️👤👥🫂👶👧🧒👦👩🧑👨👩‍🦱🧑‍🦱👨‍🦱👩‍🦰🧑‍🦰👨‍🦰👱‍♀️👱👱‍♂️👩‍🦳🧑‍🦳👨‍🦳👩‍🦲🧑‍🦲👨‍🦲🧔‍♀️🧔🧔‍♂️👵🧓👴👲👳‍♀️👳👳‍♂️🧕👮‍♀️👮👮‍♂️👷‍♀️👷👷‍♂️💂‍♀️💂🏻💂‍♂️🕵️‍♀️🕵️🕵️‍♂️👩‍⚕️🧑‍⚕️👨‍⚕️👩‍🌾🧑‍🌾👨‍🌾👩‍🍳🧑‍🍳👨‍🍳👩‍🎓🧑‍🎓👨‍🎓👩‍🎤🧑‍🎤👨‍🎤👩‍🏫🧑‍🏫👨‍🏫👩‍🏭🧑‍🏭👨‍🏭👩‍💻🧑‍💻👨‍💻👩‍💼🧑‍💼👨‍💼👩‍🔧🧑‍🔧👨‍🔧👩‍🔬🧑‍🔬👨‍🔬👩‍🎨🧑‍🎨👨‍🎨👩‍🚒🧑‍🚒👨‍🚒👩‍✈️🧑‍✈️👨‍✈️👩‍🚀🧑‍🚀👨‍🚀👩‍⚖️🧑‍⚖️👨‍⚖️👰‍♀️👰👰‍♂️🤵‍♀️🤵🤵‍♂️👸🫅🤴🥷🦸‍♀️🦸🦸‍♂️🦹‍♀️🦹🦹‍♂️🤶🧑‍🎄🎅🧙‍♀️🧙🧙‍♂️🧝‍♀️🧝🧝‍♂️🧌🧛‍♀️🧛🧛‍♂️🧟‍♀️🧟🧟‍♂️🧞‍♀️🧞🧞‍♂️🧜‍♀️🧜🧜‍♂️🧚‍♀️🧚🧚‍♂️👼🤰🫄🫃🤱👩‍🍼🧑‍🍼👨‍🍼🙇‍♀️🙇🙇‍♂️💁‍♀️💁💁‍♂️🙅‍♀️🙅🙅‍♂️🙆‍♀️🙆🙆‍♂️🙋‍♀️🙋🙋‍♂️🧏‍♀️🧏🧏‍♂️🤦‍♀️🤦🤦‍♂️🤷‍♀️🤷🤷‍♂️🙎‍♀️🙎🙎‍♂️🙍‍♀️🙍🙍‍♂️💇‍♀️💇💇‍♂️💆‍♀️💆💆‍♂️🧖‍♀️🧖🧖‍♂️💅🤳💃🕺👯‍♀️👯👯‍♂️🕴️👩‍🦽🧑‍🦽👨‍🦽👩‍🦼🧑‍🦼👨‍🦼🚶‍♀️🚶🚶‍♂️👩‍🦯🧑‍🦯👨‍🦯🧎‍♀️🧎🧎‍♂️🏃‍♀️🏃🏃‍♂️🧍‍♀️🧍🧍‍♂️👫👭👬👩‍❤️‍👨👩‍❤️‍👩💑👨‍❤️‍👨👩‍❤️‍💋‍👨👩‍❤️‍💋‍👩💏👨‍❤️‍💋‍👨🪢🧶🧵🪡🧥🥼🦺👚👕👖🩲🩳👔👗👙🩱👘🥻🩴🥿👠👡👢👞👟🥾🧦🧤🧣🎩🧢👒🎓⛑️🪖👑💍👝👛👜💼🎒🧳👓🕶️🥽🌂";

export const RAW_NATURE = "🐶🐱🦁🐯🦊🐻🐼🐨🐸🦄🐉🦖🐳🐙🦋🐝🌸🔥🌵🌴🪐🌈🍄🌊🌍☀️🌙⭐⚡✨❄️💨🌪️🌱🌲🌳🍃🍂🍁🍂";

export const RAW_FOOD = "🍎🍌🍉🍓🥑🍕🍔🍟🌮 sushi 🍣🍦🍰 donut 🍩 popcorn 🍿 🍺🍷☕ croissant 🥐 pretzel 🥨 cheese 🧀 egg 🥚🍭 bento 🍱 onigiri 🍙 ramen 🍜 curry 🍛";

export const RAW_ACTIVITIES = "⚽🏀🏈🎾🥊🎮🎯🎲🎸🎨🎬🎤🏆🥇🛹🚲🧩 bowling 🎳 saxophone 🎷 violin 🎻 kite 🪁 billiard 🎱 controller 🎮 joystick 🕹️ theater 🎭 ticket 🎟️";

export const RAW_OBJECTS = "💡📱💻📷🔭💎🛡️⚔️🗝️💊🧪🧱🎈🎁✉️💵💳";

export const RAW_SYMBOLS = "❤️🧡💛💚💙💜🖤✨⚡❄️⚛️♾️☯️🔱✅❌🧿🔔";
