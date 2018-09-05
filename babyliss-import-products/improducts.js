'use strict';

/* 
  NOTE SUITE TEST
  ajout de 'short-description', 'long-description' dans SYSTEM_ATTRIBUTES
  Todo : corriger les erreurs du BM : 
    Product: C3: Variation Attribute id 'diamètre' referenced in image group doesn't exist for product 'C3'.
    Product: ST39: Variation Attribute id 'color' referenced in image group doesn't exist for product 'ST39'.
    --> Alexandre : les variations attribute il faut le faire soit meme
*/

///////////////
const delimiter = ';';
///////////////

const commandLineArgs = require('command-line-args')

const optionDefinitions = [
  { name: 'csv', type: String},
  { name: 'xml', type: String },
  { name: 'catalog', type: String }
];
const options = commandLineArgs(optionDefinitions);

if(!options.csv) throw new Error('Missing argument : csv')
options.xml = options.xml || options.csv.substr(0, options.csv.length - '.csv'.length)+'.xml';
if(!options.catalog) throw new Error('Missing argument : catalog')

const fs = require('fs');
const CSVParser = require('csv-parse');
const xmlBuilder = require('xmlbuilder');
const decamelize = require('decamelize');

const SYSTEM_ATTRIBUTES = [
  'brand', 'longDescription', 'manufacturerName', 'name', 'pageDescription', 
  'pageKeywords', 'pageTitle', 'pageURL', 'shortDescription', 'storeReceiptName',
  'short-description', 'long-description' // fix added 2018-01-03
];
const localePrefix = 'locale_';

let locales;
const csv = CSVParser({delimiter: delimiter, columns: function(header) {
  const mandatoryFields = ['product', 'attribute'];

  mandatoryFields.forEach(function(e) {
		if(!header.includes(e)) throw new Error('Missing mandatory field : '+e);
	});

  locales = header.filter(function(e) {return e.startsWith(localePrefix)}).map(function(e) { return e.substr(localePrefix.length)});
	if(!locales.length) {
		throw new Error('No locale founds');
	}
  return header;
}});

const xml = xmlBuilder.begin().ele('catalog', {xmlns:'http://www.demandware.com/xml/impex/catalog/2006-10-31',  'catalog-id': options.catalog});

csv.on('readable', function(){
  let row;
  while(row = csv.read()){
    //<product product-id="008884303989">
    let xmlProduct = xml.ele('product', {'product-id': row.product});

    if(SYSTEM_ATTRIBUTES.includes(row.attribute)) {

      if(row.attribute == 'name') row.attribute = 'displayName';

      locales.forEach(function(curLocale) {
          xmlProduct.ele(decamelize(row.attribute, '-'), {'xml:lang': curLocale}, row[localePrefix+curLocale]);
      });
    }else {
      //<custom-attribute attribute-id="color">JJV61XX</custom-attribute>
      let xmlCustom = xmlProduct.ele('custom-attributes');
      locales.forEach(function(curLocale) {
        xmlCustom.ele('custom-attribute', {'attribute-id': row.attribute, 'xml:lang': curLocale}, row[localePrefix+curLocale]);
      });
    }
  }
});

csv.on('error', function(err){
  console.log(err.message);
});

csv.on('finish', function(){
  fs.writeFileSync(options.xml, '<?xml version="1.0" encoding="UTF-8"?>\n'+xml.end({ pretty: true}), 'utf8');
});

fs.createReadStream(options.csv).pipe(csv);
