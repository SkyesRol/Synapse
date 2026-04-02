// 去除空格加符号，  但  1.340000 后缀0 的情况没有排除
export const countDecimalPlaces = (input: number): number => {
    let stringInput = input.toString();
    const cleanedInput = stringInput.trim().replace(/^[+-]/, '');
    const parts = cleanedInput.split('.');

    return parts.length === 2 && parts[1] !== '' ? parts[1].length : 0;
}



//  修复精度，在 step = 0.1 的时候，二进制浮点 在某些步骤变成 0.70000000000000001 或者 0.3000000000000000001
export const ValueFix = (steppedValue: number, step: number): number => {
    let countDecimal = countDecimalPlaces(step);
    if (countDecimal === 0) return steppedValue;
    else {
        return parseFloat(steppedValue.toFixed(countDecimal));
    }

}