//Source: https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Math/round

/**
* Корректировка округления десятичных дробей.
*
* @param {String}  type  Тип корректировки.
* @param {Number}  value Число.
* @param {Integer} exp   Показатель степени (десятичный логарифм основания корректировки).
* @returns {Number} Скорректированное значение.
*/
function decimalAdjust(type, value, exp) {
    // Если степень не определена, либо равна нулю...
    if (typeof exp === 'undefined' || +exp === 0) {
        return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // Если значение не является числом, либо степень не является целым числом...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
    }
    // Сдвиг разрядов
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Обратный сдвиг
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

module.exports = {
    round10: function(value, exp) {
        return decimalAdjust('round', value, exp);
    },
    floor10: function(value, exp) {
        return decimalAdjust('floor', value, exp);
    },
    ceil10: function(value, exp) {
        return decimalAdjust('ceil', value, exp);
    },
    decimalAdjust: decimalAdjust
};
