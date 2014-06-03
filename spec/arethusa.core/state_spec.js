"use strict";

describe("state", function() {
  var mockConfigurator = {
    configurationFor: function(name) {
      return {};
    },
    getRetrievers: function(name) {
      return {};
    }
  };

  var createTokens = function() {
    return {
      '01': {
        id: '01',
        string: 'Arma',
        head: {
          id: '03'
        }
      },
      '02': {
        id: '02',
        string: 'virum',
        head: {
          id: '03',
        }
      },
      '03': {
        id: '03',
        string: '-que',
        head: {
          id: '04'
        }
      },
      '04': {
        id: '04',
        string: 'cano',
        head: {
          id: '00'
        }
      }
    };
  };

  beforeEach(module("arethusa.core", function($provide) {
    $provide.value('configurator', mockConfigurator);
  }));

  var state;
  beforeEach(inject(function(_state_) {
    state = _state_;
    state.tokens = createTokens();
  }));

  describe("this.countTotalTokens", function() {
    it('counts the total number of tokens, exposed through this.totalTokens', function() {
      state.countTotalTokens();
      expect(state.totalTokens).toEqual(4);
    });
  });

  describe('this.countTokens', function() {
    it('returns a count of tokens for which the given function is true', function() {
      var fn = function(token) {
        return token.string == "cano";
      };
      expect(state.countTokens(fn)).toEqual(1);
    });
  });

  describe('selection', function() {
    it('selects the clicked token', function() {
      state.selectToken('03', 'click');

      expect(state.selectedTokens).toEqual({'03': 'click'});
    });

    it('deselects all tokens after head change', function() {
      state.selectToken('01', 'click');
      state.selectToken('03', 'click');

      expect(state.selectedTokens).toEqual({});
    });

    it('selects multiple tokens with ctrl', function() {
      state.selectToken('01', 'ctrl-click');
      state.selectToken('03', 'ctrl-click');

      expect(state.selectedTokens).toEqual({'01': 'ctrl-click', '03': 'ctrl-click'});
    });
  });

  /* Default tree:
   *     04:cano
   *        |
   *     03:-que
   *      /   \
   *  01:Arma 02:virum
   */
  describe('this.handleChangeHead', function() {
    /*
     *     04:cano
     *     /    \
     * 03:-que 01:Arma
     *     |
     *  02:virum
     */
    it('parents a leaf node to the root', function() {
      state.selectToken('01', 'click');

      state.selectToken('04', 'click');

      expect(state.getToken('01').head.id).toBe('04');
    });

    /*
     *     04:cano
     *        |
     *     03:-que
     *        |
     *    02:virum
     *        |
     *     01:Arma
     */
    it('parents a leaf node to another leaf node', function() {
      state.selectToken('01', 'click');

      state.selectToken('02', 'click');

      expect(state.getToken('01').head.id).toBe('02');
    });

    /*
     *     04:cano
     *        |
     *     01:Arma
     *        |
     *     03:-que
     *        |
     *    02:virum
     */
    it('parents an inner node to a leaf node', function() {
      state.selectToken('03', 'click');

      state.selectToken('01', 'click');

      expect(state.getToken('03').head.id).toBe('01');
      expect(state.getToken('02').head.id).toBe('03');
      expect(state.getToken('01').head.id).toBe('04');
    });

    describe('with multiple selection', function() {
      /*
       *         04:cano
       *      /     |     \
       * 01:Arma 02:virum 03:-que
       */
      it('parents two leaf nodes to an inner node', function() {
        state.selectToken('01', 'click');
        state.selectToken('02', 'ctrl-click');

        state.selectToken('04', 'click');

        expect(state.getToken('01').head.id).toBe('04');
        expect(state.getToken('02').head.id).toBe('04');
        expect(state.getToken('03').head.id).toBe('04');
      });


      /*
       *     04:cano
       *        |
       *     03:-que
       *        |
       *    02:virum
       *        |
       *     01:Arma
       */
      it('ignores node in multiselection if it becomes head', function() {
        state.selectToken('01', 'click');
        state.selectToken('02', 'ctrl-click');

        state.selectToken('02', 'click');

        expect(state.getToken('01').head.id).toBe('02');
        expect(state.getToken('02').head.id).toBe('03');
      });
    });
  });

  describe('this.headsFor', function() {
    it('returns an empty array for the root', function() {
      expect(state.headsFor('00')).toEqual([]);
    });

    it('returns an array of head ids', function() {
      expect(state.headsFor('01')).toEqual(['03', '04', '00']);
    });
  });
});