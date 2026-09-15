
export const cyrToLatMap: Record<string, string> = {
'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g',
'Д':'D','д':'d','Ђ':'Đ','ђ':'đ','Е':'E','е':'e','Ж':'Ž','ж':'ž',
'З':'Z','з':'z','И':'I','и':'i','Ј':'J','ј':'j','К':'K','к':'k',
'Л':'L','л':'l','Љ':'Lj','љ':'lj','М':'M','м':'m','Н':'N','н':'n',
'Њ':'Nj','њ':'nj','О':'O','о':'o','П':'P','п':'p','Р':'R','р':'r',
'С':'S','с':'s','Т':'T','т':'t','Ћ':'Ć','ћ':'ć','У':'U','у':'u',
'Ф':'F','ф':'f','Х':'H','х':'h','Ц':'C','ц':'c','Ч':'Č','ч':'č',
'Џ':'Dž','џ':'dž','Ш':'Š','ш':'š'
};

// Latin to Cyrillic mapping
export const latToCyrMap: Record<string, string> = {
'A':'А','a':'а','B':'Б','b':'б','V':'В','v':'в','G':'Г','g':'г',
'D':'Д','d':'д','Đ':'Ђ','đ':'ђ','E':'Е','e':'е','Ž':'Ж','ž':'ж',
'Z':'З','z':'з','I':'И','i':'и','J':'Ј','j':'ј','K':'К','k':'к',
'L':'Л','l':'л','M':'М','m':'м','N':'Н','n':'н','O':'О','o':'о',
'P':'П','p':'п','R':'Р','r':'р','S':'С','s':'с','T':'Т','t':'т',
'Ć':'Ћ','ć':'ћ','U':'У','u':'у','F':'Ф','f':'ф','H':'Х','h':'х',
'C':'Ц','c':'ц','Č':'Ч','č':'ч','Š':'Ш','š':'ш'
};

export const cyrToLat = (str: string) =>
str.replace(/[\u0400-\u04FF]/g, char => cyrToLatMap[char] ?? char);

export const latToCyr = (str: string) => {
return str
    .replace(/Lj/g, 'Љ').replace(/lj/g, 'љ')
    .replace(/Nj/g, 'Њ').replace(/nj/g, 'њ')
    .replace(/Dž/g, 'Џ').replace(/dž/g, 'џ')
    .replace(/[a-zA-Z]/g, char => latToCyrMap[char] ?? char);
};

export const normalizeBase = (str: string) =>
    str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[øØ]/g, 'o')
    .replace(/[åÅ]/g, 'a')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[łŁ]/g, 'l')
    .replace(/[đĐ]/g, 'd')
    .replace(/[ćĆ]/g, 'c')
    .replace(/[čČ]/g, 'c')
    .replace(/[šŠ]/g, 's')
    .replace(/[žŽ]/g, 'z')
    .replace(/[ñÑ]/g, 'n');