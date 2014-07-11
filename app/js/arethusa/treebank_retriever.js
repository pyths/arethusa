'use strict';
/* A newable factory to handle xml files using the Perseus Treebank Schema
 *
 * The constructor functions takes a configuration object (that typically
 * contains a resource object for this service).
 *
 */
angular.module('arethusa').factory('TreebankRetriever', [
  'documentStore',
  'configurator',
  '$location',
  'idHandler',
  function (documentStore, configurator, $location, idHandler) {
    function xmlTokenToState(docIdentifier, token, sentenceId) {
      // One could formalize this to real rules that are configurable...
      //
      // Remember that attributes of the converted xml are prefixed with underscore
      var obj = {
        sentenceId: sentenceId,
        string: token._form,
        morphology: {
          lemma: token._lemma,
          postag: token._postag
        },
        relation: { label: token._relation || '' },
        head: { id: idHandler.getId(token._head) },
      };

      var sg = token._sg;
      if (sg && !sg.match(/^\s*$/)) {
        obj.sg = { ancestors: sg.split(' ') };
      }

      if (token._artificial) {
        obj.artificial = true;
        obj.type = token._artificial;
      }

      createId(obj, token, docIdentifier);

      return obj;
    }

    function IdMapping(internalId, sourceId) {
      this.internalId = internalId;
      this.sourceId   = sourceId;
    }

    function createId(stateToken, xmlToken, docIdentifier) {
      var idMap = {};
      var internalId = xmlTokenId(xmlToken);
      var sourceId   = xmlToken._id;
      idMap[docIdentifier] = new IdMapping(internalId, sourceId);
      stateToken.id = internalId;
      stateToken.idMap = idMap;
    }

    function xmlTokenId(token) {
      return token._artificial ? token._insertion_id : idHandler.getId(token._id);
    }

    function xmlSentenceToState(docIdentifier, words, id, cite) {
      var tokens = {};
      angular.forEach(words, function (xmlToken, i) {
        var token = xmlTokenToState(docIdentifier, xmlToken, id);
        tokens[token.id] = token;
      });
      return {
        id: id,
        tokens: tokens,
        cite: cite
      };
    }
    function parseDocument(json, docIdentifier) {
      var sentences = arethusaUtil.toAry(json.treebank.sentence);
      return arethusaUtil.inject([], sentences, function (memo, sentence, k) {
        var cite = extractCiteInfo(sentence);
        memo.push(xmlSentenceToState(docIdentifier, sentence.word, sentence._id, cite));
      });
    }

    // Try to support the new as well as the old schema for now
    function extractCiteInfo(sentence) {
      var cite = sentence._cite;
      if (cite) {
        return cite;
      } else {

        var docId = sentence._document_id;
        var subdoc = sentence._subdoc;
        if (subdoc) {
          return docId + ':' + subdoc;
        } else {
          return docId;
        }
      }
    }

    function findAdditionalConfInfo(json) {
      var linkInfo = json.treebank.link;
      var links =  linkInfo ? arethusaUtil.toAry(linkInfo) : [];
      return arethusaUtil.inject({}, links, function(memo, link) {
        memo[link._title] = link._href;
      });
    }

    function parsePreselections(selector) {
      // after #191 is merged, also allow range strings here
      var preselections = arethusaUtil.toAry($location.search()[selector]);
      return arethusaUtil.map(preselections, function(id) {
        return idHandler.getId(id);
      });
    }

    return function (conf) {
      var self = this;
      var resource = configurator.provideResource(conf.resource);
      var docIdentifier = conf.docIdentifier;

      this.preselections = parsePreselections(conf.preselector);
      this.getData = function (callback) {
        resource.get().then(function (res) {
          var xml = res.data;
          var json = arethusaUtil.xml2json(res.data);
          var moreConf = findAdditionalConfInfo(json);
          documentStore.addDocument(docIdentifier, {
            json: json,
            xml: xml,
            conf: moreConf
          });
          callback(parseDocument(json, docIdentifier));
        });
      };
    };
  }
]);
