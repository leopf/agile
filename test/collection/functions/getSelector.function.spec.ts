import 'mocha';
import {expect} from 'chai';
import Agile from "../../../src";
import {Selector} from "../../../src/collection/selector";

describe('getSelector Function Tests', () => {
    // Define Agile
    const App = new Agile();

    // Object Interface
    interface userInterface {
        id: number
        name: string
    }

    // Create Collection
    const MY_COLLECTION = App.Collection<userInterface>({
        selectors: ['selector1', 'selector2']
    });

    it('Has correct initial values', () => {
        expect(MY_COLLECTION.selectors['selector1'] instanceof Selector).to.eq(true, 'MY_COLLECTION selector1 Selector has been created');
        expect(MY_COLLECTION.selectors['selector2'] instanceof Selector).to.eq(true, 'MY_COLLECTION selector2 Selector has been created');
    });

    it('Can get Selector which exists', () => {
        // Get Selector
        const mySelector = MY_COLLECTION.getSelector('selector1');

        expect(mySelector instanceof Selector).to.eq(true, 'mySelector is a selector');
        expect(mySelector?.key).to.eq('selector1', 'mySelector has correct key');
        expect(mySelector?.exists).to.eq(true, 'mySelector does exist');
    });

    it('Can\'t get Selector which doesn\'t exist', () => {
        // Get Selector
        const mySelector = MY_COLLECTION.getSelector('selector3');

        expect(mySelector instanceof Selector).to.eq(false, 'mySelector is undefined');
    });
});
