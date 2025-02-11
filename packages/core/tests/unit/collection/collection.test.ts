import {
  Collection,
  Agile,
  Group,
  Selector,
  Item,
  CollectionPersistent,
  ComputedTracker,
  StatePersistent,
  TrackedChangeMethod,
} from '../../../src';
import * as Utils from '@agile-ts/utils';
import { LogMock } from '../../helper/logMock';

jest.mock('../../../src/collection/collection.persistent');

describe('Collection Tests', () => {
  interface ItemInterface {
    id: string;
    name: string;
  }

  let dummyAgile: Agile;

  beforeEach(() => {
    LogMock.mockLogs();

    dummyAgile = new Agile();

    jest.spyOn(Collection.prototype, 'initSelectors');
    jest.spyOn(Collection.prototype, 'initGroups');
    jest.spyOn(Collection.prototype, 'collect');

    jest.clearAllMocks();
  });

  it('should create Collection (default config)', () => {
    // Overwrite methods once to not call id
    jest
      .spyOn(Collection.prototype, 'initSelectors')
      .mockReturnValueOnce(undefined);
    jest
      .spyOn(Collection.prototype, 'initGroups')
      .mockReturnValueOnce(undefined);

    const collection = new Collection<ItemInterface>(dummyAgile);

    expect(collection.config).toStrictEqual({
      primaryKey: 'id',
      defaultGroupKey: 'default',
    });
    expect(collection.size).toBe(0);
    expect(collection.data).toStrictEqual({});
    expect(collection._key).toBeUndefined();
    expect(collection.isPersisted).toBeFalsy();
    expect(collection.persistent).toBeUndefined();
    expect(collection.groups).toStrictEqual({});
    expect(collection.selectors).toStrictEqual({});
    expect(collection.isCollection).toBeTruthy();

    expect(Collection.prototype.initGroups).toHaveBeenCalledWith({});
    expect(Collection.prototype.initSelectors).toHaveBeenCalledWith({});
    expect(Collection.prototype.collect).not.toHaveBeenCalled();
  });

  it('should create Collection (specific config)', () => {
    // Overwrite methods once to not call id
    jest
      .spyOn(Collection.prototype, 'initSelectors')
      .mockReturnValueOnce(undefined);
    jest
      .spyOn(Collection.prototype, 'initGroups')
      .mockReturnValueOnce(undefined);
    jest
      .spyOn(Collection.prototype, 'collect')
      .mockReturnValueOnce(undefined as any);

    const collection = new Collection<ItemInterface>(dummyAgile, {
      defaultGroupKey: 'general',
      groups: ['group1', 'group2'],
      selectors: ['selector1', 'selector2'],
      key: 'dummyCollectionKey',
      primaryKey: 'key',
      initialData: [{ id: '1', name: 'jeff' }],
    });

    expect(collection.config).toStrictEqual({
      primaryKey: 'key',
      defaultGroupKey: 'general',
    });
    expect(collection.size).toBe(0);
    expect(collection.data).toStrictEqual({});
    expect(collection._key).toBe('dummyCollectionKey');
    expect(collection.isPersisted).toBeFalsy();
    expect(collection.persistent).toBeUndefined();
    expect(collection.groups).toStrictEqual({});
    expect(collection.selectors).toStrictEqual({});
    expect(collection.isCollection).toBeTruthy();

    expect(Collection.prototype.initGroups).toHaveBeenCalledWith([
      'group1',
      'group2',
    ]);
    expect(Collection.prototype.initSelectors).toHaveBeenCalledWith([
      'selector1',
      'selector2',
    ]);
    expect(Collection.prototype.collect).toHaveBeenCalledWith([
      { id: '1', name: 'jeff' },
    ]);
  });

  it('should create Collection (specific config in function form)', () => {
    // Overwrite methods once to not call id
    jest
      .spyOn(Collection.prototype, 'initSelectors')
      .mockReturnValueOnce(undefined);
    jest
      .spyOn(Collection.prototype, 'initGroups')
      .mockReturnValueOnce(undefined);
    jest
      .spyOn(Collection.prototype, 'collect')
      .mockReturnValueOnce(undefined as any);

    const collection = new Collection<ItemInterface>(
      dummyAgile,
      (collection) => ({
        defaultGroupKey: 'general',
        groups: {
          group1: collection.Group(),
        },
        selectors: {
          selector1: collection.Selector('id1'),
        },
        key: 'dummyCollectionKey',
        primaryKey: 'key',
        initialData: [{ id: '1', name: 'jeff' }],
      })
    );

    expect(collection.config).toStrictEqual({
      primaryKey: 'key',
      defaultGroupKey: 'general',
    });
    expect(collection.size).toBe(0);
    expect(collection.data).toStrictEqual({});
    expect(collection._key).toBe('dummyCollectionKey');
    expect(collection.isPersisted).toBeFalsy();
    expect(collection.persistent).toBeUndefined();
    expect(collection.groups).toStrictEqual({});
    expect(collection.selectors).toStrictEqual({});
    expect(collection.isCollection).toBeTruthy();

    expect(Collection.prototype.initGroups).toHaveBeenCalledWith({
      group1: expect.any(Group),
    });
    expect(Collection.prototype.initSelectors).toHaveBeenCalledWith({
      selector1: expect.any(Selector),
    });
    expect(Collection.prototype.collect).toHaveBeenCalledWith([
      { id: '1', name: 'jeff' },
    ]);
  });

  it('should call reselect on Selectors but not rebuild on Groups after the Collection instantiation (specific config in function form)', () => {
    jest
      .spyOn(Selector.prototype, 'reselect')
      .mockReturnValueOnce(undefined as any);
    jest
      .spyOn(Group.prototype, 'rebuild')
      .mockReturnValueOnce(undefined as any);

    new Collection<ItemInterface>(dummyAgile, (collection) => ({
      groups: {
        group1: collection.Group(),
      },
      selectors: {
        selector1: collection.Selector('id1'),
      },
    }));

    expect(Selector.prototype.reselect).toHaveBeenCalledTimes(1);
    expect(Group.prototype.rebuild).toHaveBeenCalledTimes(2); // +1 in the creation of 'group1' Group and +1 in the creation of default Group
  });

  describe('Collection Function Tests', () => {
    let collection: Collection<ItemInterface>;

    beforeEach(() => {
      collection = new Collection(dummyAgile, { key: 'collectionKey' });
    });

    it('should call setKey with passed value', () => {
      collection.setKey = jest.fn();

      collection.key = 'newKey';

      expect(collection.setKey).toHaveBeenCalledWith('newKey');
    });

    describe('key get function tests', () => {
      it('should return current State Key', () => {
        expect(collection.key).toBe('collectionKey');
      });
    });

    describe('setKey function tests', () => {
      beforeEach(() => {
        collection.persistent = new CollectionPersistent(collection);

        collection.persistent.setKey = jest.fn();
      });

      it('should update existing Key in all instances', () => {
        if (collection.persistent) collection.persistent._key = 'collectionKey';

        collection.setKey('newKey');

        expect(collection._key).toBe('newKey');
        expect(collection.persistent?.setKey).toHaveBeenCalledWith('newKey');
      });

      it("should update existing Key in all instances except persistent if the CollectionKey and PersistKey aren't equal", () => {
        if (collection.persistent) collection.persistent._key = 'randomKey';

        collection.setKey('newKey');

        expect(collection._key).toBe('newKey');
        expect(collection.persistent?.setKey).not.toHaveBeenCalled();
      });

      it('should update existing Key in all instances except persistent if new CollectionKey is undefined', () => {
        if (collection.persistent) collection.persistent._key = 'collectionKey';

        collection.setKey(undefined);

        expect(collection._key).toBeUndefined();
        expect(collection.persistent?.setKey).not.toHaveBeenCalled();
      });
    });

    describe('Group function tests', () => {
      beforeEach(() => {
        jest.spyOn(collection, 'createGroup');
      });

      it('should create Group with key which belongs to Collection before instantiation', () => {
        collection.isInstantiated = false;
        const response = collection.Group([1, 2], {
          key: 'group1Key',
        });

        expect(collection.createGroup).not.toHaveBeenCalled();
        LogMock.hasNotLogged('warn');

        expect(response).toBeInstanceOf(Group);
        expect(response._key).toBe('group1Key');
        expect(response._value).toStrictEqual([1, 2]);
        expect(response.collection()).toBe(collection);
      });

      it('should create Group with key which belongs to Collection after instantiation and print warning', () => {
        collection.isInstantiated = true;
        const response = collection.Group([1, 2], {
          key: 'group1Key',
        });

        expect(collection.createGroup).toHaveBeenCalledWith('group1Key', [
          1,
          2,
        ]);
        LogMock.hasLoggedCode('1B:02:00');

        expect(response).toBeInstanceOf(Group);
      });

      it('should create Group with no key which belongs to Collection after instantiation and print warning', () => {
        jest.spyOn(Utils, 'generateId').mockReturnValueOnce('randomId');

        collection.isInstantiated = true;
        const response = collection.Group([1, 2]);

        expect(collection.createGroup).toHaveBeenCalledWith('randomId', [1, 2]);
        LogMock.hasLoggedCode('1B:02:00');

        expect(response).toBeInstanceOf(Group);
      });
    });

    describe('Selector function tests', () => {
      beforeEach(() => {
        jest.spyOn(collection, 'createSelector');
      });

      it('should create Selector with key which belongs to Collection before instantiation', () => {
        collection.isInstantiated = false;
        const response = collection.Selector(1, {
          key: 'selectorKey1',
        });

        expect(collection.createSelector).not.toHaveBeenCalled();
        LogMock.hasNotLogged('warn');

        expect(response).toBeInstanceOf(Selector);
        expect(response._key).toBe('selectorKey1');
        expect(response._itemKey).toStrictEqual(1);
        expect(response.collection()).toBe(collection);
      });

      it('should create Selector with key which belongs to Collection after instantiation and print warning', () => {
        collection.isInstantiated = true;
        const response = collection.Selector(1, {
          key: 'selectorKey1',
        });

        expect(collection.createSelector).toHaveBeenCalledWith(
          'selectorKey1',
          1
        );
        LogMock.hasLoggedCode('1B:02:01');

        expect(response).toBeInstanceOf(Selector);
      });

      it('should create Selector with no key which belongs to Collection after instantiation and print warning', () => {
        jest.spyOn(Utils, 'generateId').mockReturnValueOnce('randomId');

        collection.isInstantiated = true;
        const response = collection.Selector(1);

        expect(collection.createSelector).toHaveBeenCalledWith('randomId', 1);
        LogMock.hasLoggedCode('1B:02:01');

        expect(response).toBeInstanceOf(Selector);
      });
    });

    describe('initGroups function tests', () => {
      it('should create GroupsObject out of passed GroupKeys Array and add defaultGroup', () => {
        collection.initGroups(['group1', 'group2']);

        expect(collection.groups).toHaveProperty('group1');
        expect(collection.groups['group1']._key).toBe('group1');
        expect(collection.groups['group1']._value).toStrictEqual([]);
        expect(collection.groups['group1'].collection()).toBe(collection);

        expect(collection.groups).toHaveProperty('group2');
        expect(collection.groups['group2']._key).toBe('group2');
        expect(collection.groups['group2']._value).toStrictEqual([]);
        expect(collection.groups['group2'].collection()).toBe(collection);

        expect(collection.groups).toHaveProperty(
          collection.config.defaultGroupKey as any
        );
        expect(collection.groups[collection.config.defaultGroupKey]._key).toBe(
          'default'
        );
        expect(
          collection.groups[collection.config.defaultGroupKey]._value
        ).toStrictEqual([]);
        expect(
          collection.groups[collection.config.defaultGroupKey].collection()
        ).toBe(collection);
      });

      it('should create GroupsObject out of passed Groups Object and add default Group', () => {
        const dummyGroup1 = new Group(collection);
        const dummyGroup2 = new Group(collection, ['test1', 'test2'], {
          key: 'overwrittenKey',
        });

        collection.initGroups({
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
        });

        expect(collection.groups).toHaveProperty('dummyGroup1');
        expect(collection.groups['dummyGroup1']._key).toBe('dummyGroup1');
        expect(collection.groups['dummyGroup1']._value).toStrictEqual([]);
        expect(collection.groups['dummyGroup1'].collection()).toBe(collection);

        expect(collection.groups).toHaveProperty('dummyGroup2');
        expect(collection.groups['dummyGroup2']._key).toBe('overwrittenKey');
        expect(collection.groups['dummyGroup2']._value).toStrictEqual([
          'test1',
          'test2',
        ]);
        expect(collection.groups['dummyGroup2'].collection()).toBe(collection);

        expect(collection.groups).toHaveProperty(
          collection.config.defaultGroupKey as any
        );
        expect(collection.groups[collection.config.defaultGroupKey]._key).toBe(
          'default'
        );
        expect(
          collection.groups[collection.config.defaultGroupKey]._value
        ).toStrictEqual([]);
        expect(
          collection.groups[collection.config.defaultGroupKey].collection()
        ).toBe(collection);
      });
    });

    describe('initSelectors function tests', () => {
      it('should create SelectorsObject out of passed SelectorKeys Array', () => {
        collection.initSelectors(['selector1', 'selector2']);

        expect(collection.selectors).toHaveProperty('selector1');
        expect(collection.selectors['selector1']._key).toBe('selector1');
        expect(collection.selectors['selector1']._itemKey).toBe('selector1');
        expect(collection.selectors['selector1'].collection()).toBe(collection);

        expect(collection.selectors).toHaveProperty('selector2');
        expect(collection.selectors['selector2']._key).toBe('selector2');
        expect(collection.selectors['selector2']._itemKey).toBe('selector2');
        expect(collection.selectors['selector2'].collection()).toBe(collection);
      });

      it('should create SelectorsObject out of passed Selector Object', () => {
        const dummySelector1 = new Selector(collection, '1');
        const dummySelector2 = new Selector(collection, '2', {
          key: 'overwrittenKey',
        });

        collection.initSelectors({
          dummySelector1: dummySelector1,
          dummySelector2: dummySelector2,
        });

        expect(collection.selectors).toHaveProperty('dummySelector1');
        expect(collection.selectors['dummySelector1']._key).toBe(
          'dummySelector1'
        );
        expect(collection.selectors['dummySelector1']._itemKey).toBe('1');
        expect(collection.selectors['dummySelector1'].collection()).toBe(
          collection
        );

        expect(collection.selectors).toHaveProperty('dummySelector2');
        expect(collection.selectors['dummySelector2']._key).toBe(
          'overwrittenKey'
        );
        expect(collection.selectors['dummySelector2']._itemKey).toBe('2');
        expect(collection.selectors['dummySelector2'].collection()).toBe(
          collection
        );
      });
    });

    describe('collect function tests', () => {
      let dummyGroup1: Group<ItemInterface>;
      let dummyGroup2: Group<ItemInterface>;
      let defaultGroup: Group<ItemInterface>;
      let dummyItem5: Item<ItemInterface>;

      beforeEach(() => {
        dummyGroup1 = new Group(collection);
        dummyGroup2 = new Group(collection);
        defaultGroup = new Group(collection);
        dummyItem5 = new Item(collection, { id: '5', name: 'frank' });

        collection.groups = {
          [collection.config.defaultGroupKey]: defaultGroup,
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
        };

        collection.assignData = jest.fn();
        collection.assignItem = jest.fn();
        collection.createSelector = jest.fn();
        collection.createGroup = jest.fn();

        dummyGroup1.add = jest.fn();
        dummyGroup2.add = jest.fn();
        defaultGroup.add = jest.fn();
      });

      it('should add data object to Collection and to default Group (default config)', () => {
        collection.assignData = jest.fn(() => true);

        collection.collect({ id: '1', name: 'frank' });

        expect(collection.assignData).toHaveBeenCalledWith(
          {
            id: '1',
            name: 'frank',
          },
          {
            patch: false,
            background: false,
          }
        );
        expect(collection.assignItem).not.toHaveBeenCalled();

        expect(collection.createGroup).not.toHaveBeenCalled();

        expect(dummyGroup1.add).not.toHaveBeenCalled();
        expect(dummyGroup2.add).not.toHaveBeenCalled();
        expect(defaultGroup.add).toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });

        expect(collection.createSelector).not.toHaveBeenCalled();
      });

      it('should add data object to Collection and to default Group (specific config)', () => {
        collection.assignData = jest.fn(() => true);

        collection.collect({ id: '1', name: 'frank' }, [], {
          background: true,
          method: 'unshift',
          patch: true,
        });

        expect(collection.assignData).toHaveBeenCalledWith(
          {
            id: '1',
            name: 'frank',
          },
          {
            patch: true,
            background: true,
          }
        );
        expect(collection.assignItem).not.toHaveBeenCalled();

        expect(collection.createGroup).not.toHaveBeenCalled();

        expect(dummyGroup1.add).not.toHaveBeenCalled();
        expect(dummyGroup2.add).not.toHaveBeenCalled();
        expect(defaultGroup.add).toHaveBeenCalledWith('1', {
          method: 'unshift',
          background: true,
        });

        expect(collection.createSelector).not.toHaveBeenCalled();
      });

      it('should add Item to Collection and to default Group (default config)', () => {
        collection.assignItem = jest.fn(() => true);

        collection.collect(dummyItem5);

        expect(collection.assignData).not.toHaveBeenCalled();
        expect(collection.assignItem).toHaveBeenCalledWith(dummyItem5, {
          background: false,
        });

        expect(collection.createGroup).not.toHaveBeenCalled();

        expect(dummyGroup1.add).not.toHaveBeenCalled();
        expect(dummyGroup2.add).not.toHaveBeenCalled();
        expect(defaultGroup.add).toHaveBeenCalledWith('5', {
          method: 'push',
          background: false,
        });

        expect(collection.createSelector).not.toHaveBeenCalled();
      });

      it('should add Item to Collection and to default Group (specific config)', () => {
        collection.assignItem = jest.fn(() => true);

        collection.collect(dummyItem5, [], {
          background: true,
          method: 'unshift',
          patch: true,
        });

        expect(collection.assignData).not.toHaveBeenCalled();
        expect(collection.assignItem).toHaveBeenCalledWith(dummyItem5, {
          background: true,
        });

        expect(collection.createGroup).not.toHaveBeenCalled();

        expect(dummyGroup1.add).not.toHaveBeenCalled();
        expect(dummyGroup2.add).not.toHaveBeenCalled();
        expect(defaultGroup.add).toHaveBeenCalledWith('5', {
          method: 'unshift',
          background: true,
        });

        expect(collection.createSelector).not.toHaveBeenCalled();
      });

      it('should add data/item to Collection and to given + default Group (default config)', () => {
        collection.assignData = jest.fn(() => true);
        collection.assignItem = jest.fn(() => true);

        collection.collect(
          [{ id: '1', name: 'frank' }, dummyItem5, { id: '2', name: 'hans' }],
          ['dummyGroup1', 'dummyGroup2']
        );

        expect(collection.assignData).toHaveBeenCalledWith(
          {
            id: '1',
            name: 'frank',
          },
          {
            patch: false,
            background: false,
          }
        );
        expect(collection.assignData).toHaveBeenCalledWith(
          {
            id: '2',
            name: 'hans',
          },
          {
            patch: false,
            background: false,
          }
        );
        expect(collection.assignItem).toHaveBeenCalledWith(dummyItem5, {
          background: false,
        });

        expect(collection.createGroup).not.toHaveBeenCalled();

        expect(dummyGroup1.add).toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup1.add).toHaveBeenCalledWith('2', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup1.add).toHaveBeenCalledWith('5', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup2.add).toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup2.add).toHaveBeenCalledWith('2', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup2.add).toHaveBeenCalledWith('5', {
          method: 'push',
          background: false,
        });
        expect(defaultGroup.add).toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });
        expect(defaultGroup.add).toHaveBeenCalledWith('2', {
          method: 'push',
          background: false,
        });
        expect(defaultGroup.add).toHaveBeenCalledWith('5', {
          method: 'push',
          background: false,
        });

        expect(collection.createSelector).not.toHaveBeenCalled();
      });

      it("should try to add data/item to Collection and shouldn't add it to passed Groups if adding data/item failed (default config)", () => {
        collection.assignData = jest
          .fn()
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(true);
        collection.assignItem = jest.fn(() => false);

        collection.collect(
          [{ id: '1', name: 'frank' }, dummyItem5, { id: '2', name: 'hans' }],
          ['dummyGroup1', 'dummyGroup2']
        );

        expect(collection.assignData).toHaveBeenCalledWith(
          {
            id: '1',
            name: 'frank',
          },
          {
            patch: false,
            background: false,
          }
        );
        expect(collection.assignData).toHaveBeenCalledWith(
          {
            id: '2',
            name: 'hans',
          },
          {
            patch: false,
            background: false,
          }
        );
        expect(collection.assignItem).toHaveBeenCalledWith(dummyItem5, {
          background: false,
        });

        expect(collection.createGroup).not.toHaveBeenCalled();

        expect(dummyGroup1.add).not.toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup1.add).toHaveBeenCalledWith('2', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup1.add).not.toHaveBeenCalledWith('5', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup2.add).not.toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup2.add).toHaveBeenCalledWith('2', {
          method: 'push',
          background: false,
        });
        expect(dummyGroup2.add).not.toHaveBeenCalledWith('5', {
          method: 'push',
          background: false,
        });
        expect(defaultGroup.add).not.toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });
        expect(defaultGroup.add).toHaveBeenCalledWith('2', {
          method: 'push',
          background: false,
        });
        expect(defaultGroup.add).not.toHaveBeenCalledWith('5', {
          method: 'push',
          background: false,
        });

        expect(collection.createSelector).not.toHaveBeenCalled();
      });

      it("should add data object to Collection and create Groups that doesn't exist yet (default config)", () => {
        const newGroup = new Group(collection);
        newGroup.add = jest.fn();
        collection.assignData = jest.fn(() => true);
        collection.createGroup = jest.fn(function (groupKey) {
          collection.groups[groupKey] = newGroup;
          return newGroup as any;
        });

        collection.collect({ id: '1', name: 'frank' }, 'newGroup');

        expect(collection.assignData).toHaveBeenCalledWith(
          {
            id: '1',
            name: 'frank',
          },
          {
            patch: false,
            background: false,
          }
        );
        expect(collection.createGroup).toHaveBeenCalledWith('newGroup');

        expect(dummyGroup1.add).not.toHaveBeenCalled();
        expect(dummyGroup2.add).not.toHaveBeenCalled();
        expect(newGroup.add).toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });
        expect(defaultGroup.add).toHaveBeenCalledWith('1', {
          method: 'push',
          background: false,
        });

        expect(collection.createSelector).not.toHaveBeenCalled();
      });

      it('should add data object to Collection and create Selector for each Item (config.select)', () => {
        collection.assignData = jest.fn(() => true);
        collection.assignItem = jest.fn(() => true);

        collection.collect(
          [{ id: '1', name: 'frank' }, dummyItem5, { id: '2', name: 'hans' }],
          [],
          { select: true }
        );

        expect(collection.createSelector).toHaveBeenCalledWith('1', '1');
        expect(collection.createSelector).toHaveBeenCalledWith('5', '5');
        expect(collection.createSelector).toHaveBeenCalledWith('2', '2');
      });

      it("should add data object to Collection and call 'forEachItem()' for each Item (config.forEachItem)", () => {
        collection.assignData = jest
          .fn()
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(true);
        collection.assignItem = jest.fn(() => true);
        const forEachItemMock = jest.fn();

        collection.collect(
          [{ id: '1', name: 'frank' }, dummyItem5, { id: '2', name: 'hans' }],
          [],
          { forEachItem: forEachItemMock }
        );

        expect(forEachItemMock).toHaveBeenCalledWith(
          { id: '1', name: 'frank' },
          '1',
          false,
          0
        );
        expect(forEachItemMock).toHaveBeenCalledWith(dummyItem5, '5', true, 1);
        expect(forEachItemMock).toHaveBeenCalledWith(
          { id: '2', name: 'hans' },
          '2',
          true,
          2
        );
      });
    });

    describe('update function tests', () => {
      let dummyItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: 'dummyItem', name: 'frank' });
        collection.data = {
          dummyItem: dummyItem,
        };

        dummyItem.patch = jest.fn();
        dummyItem.set = jest.fn();
        collection.updateItemKey = jest.fn();
      });

      it('should update existing Item by patching valid changes Object (default config)', () => {
        const response = collection.update('dummyItem', { name: 'hans' });

        expect(response).toBe(dummyItem);
        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
        expect(dummyItem.patch).toHaveBeenCalledWith(
          {
            name: 'hans',
          },
          {
            background: false,
            addNewProperties: true,
          }
        );
        expect(dummyItem.set).not.toHaveBeenCalled();
        expect(collection.updateItemKey).not.toHaveBeenCalled();
      });

      it('should update existing Item by patching valid changes Object (specific config)', () => {
        const response = collection.update(
          'dummyItem',
          { name: 'hans' },
          {
            background: true,
          }
        );

        expect(response).toBe(dummyItem);
        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
        expect(dummyItem.patch).toHaveBeenCalledWith(
          {
            name: 'hans',
          },
          {
            background: true,
            addNewProperties: true,
          }
        );
        expect(dummyItem.set).not.toHaveBeenCalled();
        expect(collection.updateItemKey).not.toHaveBeenCalled();
      });

      it('should update existing placeholder Item by patching valid changes Object (default config)', () => {
        dummyItem.isPlaceholder = true;

        const response = collection.update('dummyItem', { name: 'hans' });

        expect(response).toBe(dummyItem);
        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
        expect(dummyItem.patch).toHaveBeenCalledWith(
          {
            name: 'hans',
          },
          {
            background: false,
            addNewProperties: true,
          }
        );
        expect(dummyItem.set).not.toHaveBeenCalled();
        expect(collection.updateItemKey).not.toHaveBeenCalled();
      });

      it('should update existing Item by setting valid changes Object (default config)', () => {
        const response = collection.update(
          'dummyItem',
          { id: 'dummyItem', name: 'hans' },
          { patch: false }
        );

        expect(response).toBe(dummyItem);
        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
        expect(dummyItem.patch).not.toHaveBeenCalled();
        expect(dummyItem.set).toHaveBeenCalledWith(
          { id: 'dummyItem', name: 'hans' },
          { background: false }
        );
        expect(collection.updateItemKey).not.toHaveBeenCalled();
      });

      it('should update existing Item by setting valid changes Object (specific config)', () => {
        const response = collection.update(
          'dummyItem',
          { id: 'dummyItem', name: 'hans' },
          {
            patch: false,
            background: true,
          }
        );

        expect(response).toBe(dummyItem);
        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
        expect(dummyItem.patch).not.toHaveBeenCalled();
        expect(dummyItem.set).toHaveBeenCalledWith(
          { id: 'dummyItem', name: 'hans' },
          { background: true }
        );
        expect(collection.updateItemKey).not.toHaveBeenCalled();
      });

      it('should update existing Item by setting valid changes Object without primaryKey and should print warning (default config)', () => {
        const response = collection.update(
          'dummyItem',
          { name: 'hans' },
          { patch: false }
        );

        expect(response).toBe(dummyItem);
        LogMock.hasNotLogged('error');
        LogMock.hasLoggedCode('1B:02:02', [], {
          id: 'dummyItem',
          name: 'hans',
        });
        expect(dummyItem.patch).not.toHaveBeenCalled();
        expect(dummyItem.set).toHaveBeenCalledWith(
          { id: 'dummyItem', name: 'hans' },
          { background: false }
        );
        expect(collection.updateItemKey).not.toHaveBeenCalled();
      });

      it("shouldn't update not existing Item and should print error", () => {
        const response = collection.update('notExisting', { name: 'hans' });

        expect(response).toBeUndefined();
        LogMock.hasLoggedCode('1B:03:00', ['notExisting', collection._key]);
        LogMock.hasNotLogged('warn');
        expect(dummyItem.patch).not.toHaveBeenCalled();
        expect(dummyItem.set).not.toHaveBeenCalled();
        expect(collection.updateItemKey).not.toHaveBeenCalled();
      });

      it("shouldn't update existing Item with invalid changes Object and should print error", () => {
        const response = collection.update(
          'dummyItem',
          'notValidChanges' as any
        );

        expect(response).toBeUndefined();
        LogMock.hasLoggedCode('1B:03:01', ['dummyItem', collection._key]);
        LogMock.hasNotLogged('warn');
        expect(dummyItem.patch).not.toHaveBeenCalled();
        expect(dummyItem.set).not.toHaveBeenCalled();
        expect(collection.updateItemKey).not.toHaveBeenCalled();
      });

      it('should update existing Item and its ItemKey with valid changes Object if ItemKey has changed (default config)', () => {
        const response = collection.update('dummyItem', {
          id: 'newDummyItemKey',
          name: 'hans',
        });

        expect(response).toBe(dummyItem);
        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
        expect(dummyItem.patch).toHaveBeenCalledWith(
          {
            name: 'hans',
          },
          {
            background: false,
            addNewProperties: true,
          }
        );
        expect(dummyItem.set).not.toHaveBeenCalled();
        expect(collection.updateItemKey).toHaveBeenCalledWith(
          'dummyItem',
          'newDummyItemKey',
          {
            background: false,
          }
        );
      });
    });

    describe('createGroup function tests', () => {
      let dummyGroup: Group<ItemInterface>;
      let dummyItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: 'dummyItem', name: 'frank' });
        collection.data = {
          dummyItem: dummyItem,
        };

        dummyGroup = new Group(collection, [], { key: 'dummyGroup' });
        collection.groups = {
          dummyGroup: dummyGroup,
        };

        dummyGroup.set = jest.fn();
      });

      it('should create and add not existing Group to Collection', () => {
        const response = collection.createGroup('newGroup', ['dummyItem']);

        LogMock.hasNotLogged('warn');
        expect(response).toBeInstanceOf(Group);
        expect(response._key).toBe('newGroup');
        expect(response.isPlaceholder).toBeFalsy();
        expect(response._value).toStrictEqual(['dummyItem']);
        expect(collection.groups['newGroup']).toBe(response);
      });

      it("shouldn't create and add existing Group to Collection", () => {
        const response = collection.createGroup('dummyGroup', ['dummyItem']);

        LogMock.hasLoggedCode('1B:03:02', ['dummyGroup']);
        expect(response).toBe(dummyGroup);
        expect(collection.groups['dummyGroup']).toBe(dummyGroup);
        expect(dummyGroup.set).not.toHaveBeenCalled();
      });

      it('should update existing placeholder Group of Collection', () => {
        dummyGroup.isPlaceholder = true;

        const response = collection.createGroup('dummyGroup', ['dummyItem']);

        LogMock.hasNotLogged('warn');
        expect(response).toBe(dummyGroup);
        expect(collection.groups['dummyGroup']).toBe(dummyGroup);
        expect(dummyGroup.set).toHaveBeenCalledWith(['dummyItem'], {
          overwrite: true,
        });
      });
    });

    describe('hasGroup function tests', () => {
      let dummyGroup: Group<ItemInterface>;

      beforeEach(() => {
        dummyGroup = new Group(collection, []);

        collection.getGroup = jest.fn();
      });

      it('should call getGroup and return true if getGroup returns Group (default config)', () => {
        collection.getGroup = jest.fn(() => dummyGroup as any);

        const response = collection.hasGroup('test');

        expect(response).toBeTruthy();
        expect(collection.getGroup).toHaveBeenCalledWith('test', {});
      });

      it('should call getGroup and return true if getGroup returns Group (specific config)', () => {
        collection.getGroup = jest.fn(() => dummyGroup as any);

        const response = collection.hasGroup('test', { notExisting: true });

        expect(response).toBeTruthy();
        expect(collection.getGroup).toHaveBeenCalledWith('test', {
          notExisting: true,
        });
      });

      it('should call getGroup and return false if getGroup returns undefined (default config)', () => {
        collection.getGroup = jest.fn(() => undefined);

        const response = collection.hasGroup('test');

        expect(response).toBeFalsy();
        expect(collection.getGroup).toHaveBeenCalledWith('test', {});
      });
    });

    describe('getGroup function tests', () => {
      let dummyGroup: Group<ItemInterface>;

      beforeEach(() => {
        dummyGroup = new Group(collection, [], { key: 'dummyGroup' });
        collection.groups = {
          dummyGroup: dummyGroup,
        };

        ComputedTracker.tracked = jest.fn();
      });

      it('should return and track existing Group (default config)', () => {
        const response = collection.getGroup('dummyGroup');

        expect(response).toBe(dummyGroup);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummyGroup.observers['value']
        );
      });

      it("shouldn't return and track not existing Group (default config)", () => {
        const response = collection.getGroup('notExistingGroup');

        expect(response).toBeUndefined();
        expect(ComputedTracker.tracked).not.toHaveBeenCalled();
      });

      it("shouldn't return and track existing placeholder Group (default config)", () => {
        dummyGroup.isPlaceholder = true;

        const response = collection.getGroup('dummyGroup');

        expect(response).toBeUndefined();
        expect(ComputedTracker.tracked).not.toHaveBeenCalled();
      });

      it('should return and track existing placeholder Group (config.notExisting = true)', () => {
        dummyGroup.isPlaceholder = true;

        const response = collection.getGroup('dummyGroup', {
          notExisting: true,
        });

        expect(response).toBe(dummyGroup);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummyGroup.observers['value']
        );
      });
    });

    describe('getDefaultGroup function tests', () => {
      it('should return default Group', () => {
        jest
          .spyOn(collection, 'getGroup')
          .mockReturnValueOnce('fakeGroup' as any);
        const response = collection.getDefaultGroup();

        expect(collection.getGroup).toHaveBeenCalledWith(
          collection.config.defaultGroupKey
        );
        expect(response).toBe('fakeGroup');
      });
    });

    describe('getGroupWithReference function tests', () => {
      let dummyGroup: Group<ItemInterface>;

      beforeEach(() => {
        dummyGroup = new Group(collection, [], { key: 'dummyGroup' });
        collection.groups = {
          dummyGroup: dummyGroup,
        };

        ComputedTracker.tracked = jest.fn();
      });

      it('should return and track existing Group', () => {
        const response = collection.getGroupWithReference('dummyGroup');

        expect(response).toBe(dummyGroup);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummyGroup.observers['value']
        );
      });

      it("should return and track created reference Group if Group doesn't exist yet", () => {
        const response = collection.getGroupWithReference('notExistingGroup');

        expect(response).toBeInstanceOf(Group);
        expect(response.isPlaceholder).toBeTruthy();
        expect(response._key).toBe('notExistingGroup');
        expect(collection.groups['notExistingGroup']).toBe(response);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          response.observers['value']
        );
      });
    });

    describe('removeGroup function tests', () => {
      let dummyGroup: Group<ItemInterface>;

      beforeEach(() => {
        dummyGroup = new Group(collection, [], { key: 'dummyGroup' });
        collection.groups = {
          dummyGroup: dummyGroup,
        };
      });

      it('should remove existing Group', () => {
        collection.removeGroup('dummyGroup');

        expect(collection.groups).not.toHaveProperty('dummyGroup');
      });

      it("shouldn't remove not existing Group and print warning", () => {
        collection.removeGroup('notExistingGroup');

        expect(collection.groups).toHaveProperty('dummyGroup');
      });
    });

    describe('createSelector function tests', () => {
      let dummySelector: Selector<ItemInterface>;
      let dummyItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: 'dummyItem', name: 'frank' });
        collection.data = {
          dummyItem: dummyItem,
        };

        dummySelector = new Selector(collection, 'dummyItem', {
          key: 'dummySelector',
        });
        collection.selectors = {
          dummySelector: dummySelector,
        };

        dummySelector.select = jest.fn();
      });

      it('should create and add not existing Selector to Collection', () => {
        const response = collection.createSelector('newSelector', 'dummyItem');

        LogMock.hasNotLogged('warn');
        expect(response).toBeInstanceOf(Selector);
        expect(response._key).toBe('newSelector');
        expect(response.isPlaceholder).toBeFalsy();
        expect(response._itemKey).toStrictEqual('dummyItem');
        expect(collection.selectors['newSelector']).toBe(response);
      });

      it("shouldn't create and add existing Selector to Collection", () => {
        const response = collection.createSelector(
          'dummySelector',
          'dummyItem'
        );

        LogMock.hasLoggedCode('1B:03:03', ['dummySelector']);
        expect(response).toBe(dummySelector);
        expect(collection.selectors['dummySelector']).toBe(dummySelector);
        expect(dummySelector.select).not.toHaveBeenCalled();
      });

      it('should update existing placeholder Selector of Collection', () => {
        dummySelector.isPlaceholder = true;

        const response = collection.createSelector(
          'dummySelector',
          'dummyItem'
        );

        LogMock.hasNotLogged('warn');
        expect(response).toBe(dummySelector);
        expect(collection.selectors['dummySelector']).toBe(dummySelector);
        expect(dummySelector.select).toHaveBeenCalledWith('dummyItem', {
          overwrite: true,
        });
      });
    });

    describe('select function tests', () => {
      beforeEach(() => {
        collection.createSelector = jest.fn();
      });
      it(
        'should call createSelector with the specified itemKey ' +
          'as key of the Selector and as selected item key',
        () => {
          collection.select('test');

          expect(collection.createSelector).toHaveBeenCalledWith(
            'test',
            'test'
          );
        }
      );
    });

    describe('hasSelector function tests', () => {
      let dummySelector: Selector<ItemInterface>;

      beforeEach(() => {
        dummySelector = new Selector(collection, 'unknown');

        collection.getSelector = jest.fn();
      });

      it('should call getSelector and return true if getSelector returns Selector (default config)', () => {
        collection.getSelector = jest.fn(() => dummySelector as any);

        const response = collection.hasSelector('test');

        expect(response).toBeTruthy();
        expect(collection.getSelector).toHaveBeenCalledWith('test', {});
      });

      it('should call getSelector and return true if getSelector returns Selector (specific config)', () => {
        collection.getSelector = jest.fn(() => dummySelector as any);

        const response = collection.hasSelector('test', { notExisting: true });

        expect(response).toBeTruthy();
        expect(collection.getSelector).toHaveBeenCalledWith('test', {
          notExisting: true,
        });
      });

      it('should call getSelector and return false if getSelector returns undefined (default config)', () => {
        collection.getSelector = jest.fn(() => undefined);

        const response = collection.hasSelector('test');

        expect(response).toBeFalsy();
        expect(collection.getSelector).toHaveBeenCalledWith('test', {});
      });
    });

    describe('getSelector function tests', () => {
      let dummySelector: Selector<ItemInterface>;
      let dummyItem1: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: 'dummyItem1', name: 'frank' });
        collection.data = {
          ['dummyItem1']: dummyItem1,
        };

        dummySelector = new Selector(collection, 'dummyItem1', {
          key: 'dummySelector',
        });
        collection.selectors = {
          dummySelector: dummySelector,
        };

        ComputedTracker.tracked = jest.fn();
      });

      it('should return and track existing Selector (default config)', () => {
        const response = collection.getSelector('dummySelector');

        expect(response).toBe(dummySelector);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummySelector.observers['value']
        );
      });

      it("shouldn't return and track not existing Selector (default config)", () => {
        const response = collection.getSelector('notExistingSelector');

        expect(response).toBeUndefined();
        expect(ComputedTracker.tracked).not.toHaveBeenCalled();
      });

      it("shouldn't return and track existing placeholder Selector (default config)", () => {
        dummySelector.isPlaceholder = true;

        const response = collection.getSelector('dummySelector');

        expect(response).toBeUndefined();
        expect(ComputedTracker.tracked).not.toHaveBeenCalled();
      });

      it('should return and track existing placeholder Selector (config.notExisting = true)', () => {
        dummySelector.isPlaceholder = true;

        const response = collection.getSelector('dummySelector', {
          notExisting: true,
        });

        expect(response).toBe(dummySelector);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummySelector.observers['value']
        );
      });
    });

    describe('getSelectorWithReference function tests', () => {
      let dummySelector: Selector<ItemInterface>;
      let dummyItem1: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: 'dummyItem1', name: 'frank' });
        collection.data = {
          ['dummyItem1']: dummyItem1,
        };

        dummySelector = new Selector(collection, 'dummyItem1', {
          key: 'dummySelector',
        });
        collection.selectors = {
          dummySelector: dummySelector,
        };

        ComputedTracker.tracked = jest.fn();
      });

      it('should return and track existing Selector', () => {
        const response = collection.getSelectorWithReference('dummySelector');

        expect(response).toBe(dummySelector);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummySelector.observers['value']
        );
      });

      it("should return and track created reference Selector if Selector doesn't exist yet", () => {
        const response = collection.getSelectorWithReference(
          'notExistingSelector'
        );

        expect(response).toBeInstanceOf(Selector);
        expect(response.isPlaceholder).toBeTruthy();
        expect(response._item).toBeNull();
        expect(response._itemKey).toBeNull();
        expect(response._key).toBe('notExistingSelector');

        expect(collection.selectors['notExistingSelector']).toBe(response);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          response.observers['value']
        );
      });
    });

    describe('removeSelector function tests', () => {
      let dummySelector: Selector<ItemInterface>;

      beforeEach(() => {
        dummySelector = new Selector(collection, 'dummyItem', {
          key: 'dummySelector',
        });
        collection.selectors = {
          dummySelector: dummySelector,
        };

        dummySelector.unselect = jest.fn();
      });

      it('should remove existing Selector', () => {
        collection.removeSelector('dummySelector');

        expect(collection.selectors).not.toHaveProperty('dummySelector');
        expect(dummySelector.unselect).toHaveBeenCalled();
      });

      it("shouldn't remove not existing Selector and print warning", () => {
        collection.removeSelector('notExistingSelector');

        expect(collection.selectors).toHaveProperty('dummySelector');
        expect(dummySelector.unselect).not.toHaveBeenCalled();
      });
    });

    describe('hasItem function tests', () => {
      let dummyItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: '1', name: 'Jeff' });

        collection.getItem = jest.fn();
      });

      it('should call getItem and return true if getItem returns Item (default config)', () => {
        collection.getItem = jest.fn(() => dummyItem);

        const response = collection.hasItem('test');

        expect(response).toBeTruthy();
        expect(collection.getItem).toHaveBeenCalledWith('test', {});
      });

      it('should call getItem and return true if getItem returns Item (specific config)', () => {
        collection.getItem = jest.fn(() => dummyItem);

        const response = collection.hasItem('test', { notExisting: true });

        expect(response).toBeTruthy();
        expect(collection.getItem).toHaveBeenCalledWith('test', {
          notExisting: true,
        });
      });

      it('should call getItem and return false if getItem returns undefined (default config)', () => {
        collection.getItem = jest.fn(() => undefined);

        const response = collection.hasItem('test');

        expect(response).toBeFalsy();
        expect(collection.getItem).toHaveBeenCalledWith('test', {});
      });
    });

    describe('getItem function tests', () => {
      let dummyItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: '1', name: 'Jeff' });
        collection.data = {
          ['1']: dummyItem,
        };

        ComputedTracker.tracked = jest.fn();
      });

      it('should return and track existing Item (default config)', () => {
        const response = collection.getItem('1');

        expect(response).toBe(dummyItem);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummyItem.observers['value']
        );
      });

      it("shouldn't return and track not existing Item (default config)", () => {
        const response = collection.getItem('notExistingItem');

        expect(response).toBeUndefined();
        expect(ComputedTracker.tracked).not.toHaveBeenCalled();
      });

      it("shouldn't return and track existing placeholder Item (default config)", () => {
        dummyItem.isPlaceholder = true;

        const response = collection.getItem('1');

        expect(response).toBeUndefined();
        expect(ComputedTracker.tracked).not.toHaveBeenCalled();
      });

      it('should return and track existing placeholder Item (config.notExisting = true)', () => {
        dummyItem.isPlaceholder = true;

        const response = collection.getItem('1', {
          notExisting: true,
        });

        expect(response).toBe(dummyItem);
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummyItem.observers['value']
        );
      });
    });

    describe('getItemWithReference function tests', () => {
      let dummyItem: Item<ItemInterface>;
      let placeholderItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: '1', name: 'Jeff' });
        placeholderItem = collection.createPlaceholderItem('1');

        collection.data = {
          ['1']: dummyItem,
        };
        collection.createPlaceholderItem = jest
          .fn()
          .mockReturnValueOnce(placeholderItem);

        ComputedTracker.tracked = jest.fn();
      });

      it('should return and track existing Item', () => {
        const response = collection.getItemWithReference('1');

        expect(response).toBe(dummyItem);
        expect(collection.createPlaceholderItem).not.toHaveBeenCalled();
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          dummyItem.observers['value']
        );
      });

      it("should return and track created reference Item if searched Item doesn't exist yet", () => {
        const response = collection.getItemWithReference('notExistingItem');

        expect(response).toBe(placeholderItem);
        expect(collection.createPlaceholderItem).toHaveBeenCalledWith(
          'notExistingItem',
          true
        );
        expect(ComputedTracker.tracked).toHaveBeenCalledWith(
          placeholderItem.observers['value']
        );
      });
    });

    describe('createPlaceholderItem function tests', () => {
      let dummyItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: '1', name: 'Jeff' });

        collection.data = {
          ['1']: dummyItem,
        };

        ComputedTracker.tracked = jest.fn();
      });

      it("should create placeholder Item and shouldn't add it to Collection (addToCollection = false)", () => {
        const item = collection.createPlaceholderItem('2', false);

        expect(item).not.toBe(dummyItem);
        expect(item.collection()).toBe(collection);
        expect(item._key).toBe('2');
        expect(item._value).toStrictEqual({ id: '2', dummy: 'item' });
        expect(item.isPlaceholder).toBeTruthy();

        expect(collection.data).not.toHaveProperty('2');

        expect(ComputedTracker.tracked).toHaveBeenCalledTimes(1);
        expect(ComputedTracker.tracked).not.toHaveBeenCalledWith(
          dummyItem.observers['value']
        );
      });

      it("should create placeholder Item and shouldn't add it to Collection if Item already exists (addToCollection = true)", () => {
        const item = collection.createPlaceholderItem('1', false);

        expect(item).not.toBe(dummyItem);
        expect(item.collection()).toBe(collection);
        expect(item._key).toBe('1');
        expect(item._value).toStrictEqual({ id: '1', dummy: 'item' });
        expect(item.isPlaceholder).toBeTruthy();

        expect(collection.data).toHaveProperty('1');
        expect(collection.data['1']).toBe(dummyItem);

        expect(ComputedTracker.tracked).toHaveBeenCalledTimes(1);
        expect(ComputedTracker.tracked).not.toHaveBeenCalledWith(
          dummyItem.observers['value']
        );
      });

      it('should create placeholder Item and add it to Collection (addToCollection = true)', () => {
        const item = collection.createPlaceholderItem('2', true);

        expect(item).not.toBe(dummyItem);
        expect(item.collection()).toBe(collection);
        expect(item._key).toBe('2');
        expect(item._value).toStrictEqual({ id: '2', dummy: 'item' });
        expect(item.isPlaceholder).toBeTruthy();

        expect(collection.data).toHaveProperty('2');
        expect(collection.data['2']).toStrictEqual(expect.any(Item));
        expect(collection.data['2']._key).toBe('2');

        expect(ComputedTracker.tracked).toHaveBeenCalledTimes(1);
        expect(ComputedTracker.tracked).not.toHaveBeenCalledWith(
          dummyItem.observers['value']
        );
      });
    });

    describe('getItemValue function tests', () => {
      let dummyItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: '1', name: 'Jeff' });
        collection.data = {
          ['1']: dummyItem,
        };

        jest.spyOn(collection, 'getItem');
      });

      it('should return existing Item Value (default config)', () => {
        const response = collection.getItemValue('1');

        expect(response).toStrictEqual(dummyItem._value);
        expect(collection.getItem).toHaveBeenCalledWith('1', {});
      });

      it("shouldn't return not existing Item Value (default config)", () => {
        const response = collection.getItemValue('notExistingItem');

        expect(response).toBeUndefined();
        expect(collection.getItem).toHaveBeenCalledWith('notExistingItem', {});
      });

      it("shouldn't return existing placeholder Item Value (default config)", () => {
        dummyItem.isPlaceholder = true;

        const response = collection.getItemValue('1');

        expect(response).toBeUndefined();
        expect(collection.getItem).toHaveBeenCalledWith('1', {});
      });

      it('should return existing placeholder Item Value (config.notExisting = true)', () => {
        dummyItem.isPlaceholder = true;

        const response = collection.getItemValue('1', {
          notExisting: true,
        });

        expect(response).toStrictEqual(dummyItem._value);
        expect(collection.getItem).toHaveBeenCalledWith('1', {
          notExisting: true,
        });
      });
    });

    describe('getAllItems function tests', () => {
      let dummyItem1: Item<ItemInterface>;
      let dummyItem2: Item<ItemInterface>;
      let dummyItem3: Item<ItemInterface>;
      let defaultGroup: Group<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: '1', name: 'Jeff' });
        dummyItem1.isPlaceholder = false;
        dummyItem2 = new Item(collection, { id: '2', name: 'Hans' });
        dummyItem2.isPlaceholder = true;
        dummyItem3 = new Item(collection, { id: '3', name: 'Frank' });
        dummyItem3.isPlaceholder = false;
        collection.data = {
          ['1']: dummyItem1,
          ['2']: dummyItem2,
          ['3']: dummyItem3,
        };

        defaultGroup = collection.getDefaultGroup() as any;
        defaultGroup.add(['1', '2', '3']);
        jest.spyOn(defaultGroup, 'getItems');
      });

      it('should return all existing Items (default config)', () => {
        const items = collection.getAllItems();

        expect(defaultGroup.getItems).toHaveBeenCalled();

        expect(items.includes(dummyItem1)).toBeTruthy();
        expect(items.includes(dummyItem2)).toBeFalsy();
        expect(items.includes(dummyItem3)).toBeTruthy();
      });

      it('should return all Items (config.notExisting = true)', () => {
        const items = collection.getAllItems({ notExisting: true });

        expect(defaultGroup.getItems).not.toHaveBeenCalled();

        expect(items.includes(dummyItem1)).toBeTruthy();
        expect(items.includes(dummyItem2)).toBeTruthy();
        expect(items.includes(dummyItem3)).toBeTruthy();
      });
    });

    describe('getAllItemValues function tests', () => {
      let dummyItem1: Item<ItemInterface>;
      let dummyItem2: Item<ItemInterface>;
      let dummyItem3: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: '1', name: 'Jeff' });
        dummyItem1.isPlaceholder = false;
        dummyItem2 = new Item(collection, { id: '2', name: 'Hans' });
        dummyItem2.isPlaceholder = true;
        dummyItem3 = new Item(collection, { id: '3', name: 'Frank' });
        dummyItem3.isPlaceholder = false;
        collection.data = {
          ['1']: dummyItem1,
          ['2']: dummyItem2,
          ['3']: dummyItem3,
        };

        collection.getDefaultGroup()?.add(['1', '2', '3']);

        jest.spyOn(collection, 'getAllItems');
      });

      it('should return all existing Items (default config)', () => {
        const itemValues = collection.getAllItemValues();

        expect(collection.getAllItems).toHaveBeenCalledWith({});
        expect(itemValues).toStrictEqual([
          { id: '1', name: 'Jeff' },
          { id: '3', name: 'Frank' },
        ]);
      });

      it('should return all Items (config.notExisting = true)', () => {
        const itemValues = collection.getAllItemValues({ notExisting: true });

        expect(collection.getAllItems).toHaveBeenCalledWith({
          notExisting: true,
        });
        expect(itemValues).toStrictEqual([
          { id: '1', name: 'Jeff' },
          { id: '2', name: 'Hans' },
          { id: '3', name: 'Frank' },
        ]);
      });
    });

    describe('persist function tests', () => {
      it('should create Persistent (default config)', () => {
        collection.persist();

        expect(collection.persistent).toBeInstanceOf(CollectionPersistent);
        expect(CollectionPersistent).toHaveBeenCalledWith(collection, {
          key: collection._key,
        });
      });

      it('should create Persistent (specific config)', () => {
        collection.persist({
          key: 'specificKey',
          storageKeys: ['test1', 'test2'],
          loadValue: false,
          defaultStorageKey: 'test1',
        });

        expect(collection.persistent).toBeInstanceOf(CollectionPersistent);
        expect(CollectionPersistent).toHaveBeenCalledWith(collection, {
          loadValue: false,
          storageKeys: ['test1', 'test2'],
          key: 'specificKey',
          defaultStorageKey: 'test1',
        });
      });

      it("shouldn't overwrite existing Persistent", () => {
        const dummyPersistent = new CollectionPersistent(collection);
        collection.persistent = dummyPersistent;
        collection.isPersisted = true;
        jest.clearAllMocks();

        collection.persist({ key: 'newPersistentKey' });

        expect(collection.persistent).toBe(dummyPersistent);
        // expect(collection.persistent._key).toBe("newPersistentKey"); // Can not test because of Mocking Persistent
        expect(CollectionPersistent).not.toHaveBeenCalled();
      });
    });

    describe('onLoad function tests', () => {
      const dummyCallbackFunction = jest.fn();

      it("should set onLoad function if Collection is persisted and shouldn't call it initially (collection.isPersisted = false)", () => {
        collection.persistent = new CollectionPersistent(collection);
        collection.isPersisted = false;

        collection.onLoad(dummyCallbackFunction);

        expect(collection.persistent.onLoad).toBe(dummyCallbackFunction);
        expect(dummyCallbackFunction).not.toHaveBeenCalled();
        LogMock.hasNotLogged('warn');
      });

      it('should set onLoad function if Collection is persisted and should call it initially (collection.isPersisted = true)', () => {
        collection.persistent = new CollectionPersistent(collection);
        collection.isPersisted = true;

        collection.onLoad(dummyCallbackFunction);

        expect(collection.persistent.onLoad).toBe(dummyCallbackFunction);
        expect(dummyCallbackFunction).toHaveBeenCalledWith(true);
        LogMock.hasNotLogged('warn');
      });

      it("shouldn't set onLoad function if Collection isn't persisted", () => {
        collection.onLoad(dummyCallbackFunction);

        expect(collection?.persistent?.onLoad).toBeUndefined();
        expect(dummyCallbackFunction).not.toHaveBeenCalled();
        LogMock.hasNotLogged('warn');
      });

      it("shouldn't set invalid onLoad callback function", () => {
        collection.persistent = new CollectionPersistent(collection);
        collection.isPersisted = true;

        collection.onLoad(10 as any);

        expect(collection?.persistent?.onLoad).toBeUndefined();
        LogMock.hasLoggedCode('00:03:01', ['OnLoad Callback', 'function']);
      });
    });

    describe('getGroupCount function tests', () => {
      beforeEach(() => {
        collection.groups = {
          1: 'x' as any,
          2: 'y' as any,
          10: 'z' as any,
        };
      });

      it('should return count of registered Groups', () => {
        expect(collection.getGroupCount()).toBe(3);
      });
    });

    describe('getSelectorCount function tests', () => {
      beforeEach(() => {
        collection.selectors = {
          1: 'x' as any,
          2: 'y' as any,
          10: 'z' as any,
        };
      });

      it('should return count of registered Selectors', () => {
        expect(collection.getSelectorCount()).toBe(3);
      });
    });

    describe('reset function tests', () => {
      let dummyGroup: Group<ItemInterface>;
      let dummySelector: Selector<ItemInterface>;
      let dummyItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem = new Item(collection, { id: 'dummyItem', name: 'frank' });
        collection.data = {
          dummyItem: dummyItem,
        };
        dummyGroup = new Group(collection, [], { key: 'dummyGroup' });
        collection.groups = {
          dummyGroup: dummyGroup,
        };
        dummySelector = new Selector(collection, 'dummyItem', {
          key: 'dummySelector',
        });
        collection.selectors = {
          dummySelector: dummySelector,
        };

        dummyGroup.reset = jest.fn();
        dummySelector.reset = jest.fn();
      });

      it('should reset Collection and its Selectors and Groups', () => {
        collection.reset();

        expect(collection.data).toStrictEqual({});
        expect(collection.size).toBe(0);
        expect(dummySelector.reset).toHaveBeenCalled();
        expect(dummyGroup.reset).toHaveBeenCalled();
      });
    });

    describe('put function tests', () => {
      let dummyGroup1: Group<ItemInterface>;
      let dummyGroup2: Group<ItemInterface>;

      beforeEach(() => {
        dummyGroup1 = new Group(collection, [], { key: 'dummyGroup1' });
        dummyGroup2 = new Group(collection, [], { key: 'dummyGroup2' });
        collection.groups = {
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
        };

        dummyGroup1.add = jest.fn();
        dummyGroup2.add = jest.fn();
      });

      it('should add passed itemKey to passed Group (default config)', () => {
        collection.put('1', 'dummyGroup1');

        expect(dummyGroup1.add).toHaveBeenCalledWith(['1'], {});
        expect(dummyGroup2.add).not.toHaveBeenCalled();
      });

      it('should add passed itemKey to passed Group (specific config)', () => {
        collection.put('1', 'dummyGroup1', {
          overwrite: true,
          method: 'push',
        });

        expect(dummyGroup1.add).toHaveBeenCalledWith(['1'], {
          overwrite: true,
          method: 'push',
        });
        expect(dummyGroup2.add).not.toHaveBeenCalled();
      });

      it('should add passed itemKeys to passed Groups (default config)', () => {
        collection.put(
          ['1', '2', '3'],
          ['dummyGroup1', 'notExistingGroup', 'dummyGroup2']
        );

        expect(dummyGroup1.add).toHaveBeenCalledWith(['1', '2', '3'], {});
        expect(dummyGroup2.add).toHaveBeenCalledWith(['1', '2', '3'], {});
      });
    });

    describe('move function tests', () => {
      let dummyGroup1: Group<ItemInterface>;
      let dummyGroup2: Group<ItemInterface>;

      beforeEach(() => {
        dummyGroup1 = new Group(collection, [], { key: 'dummyGroup1' });
        dummyGroup2 = new Group(collection, ['1', '2', '3'], {
          key: 'dummyGroup2',
        });
        collection.groups = {
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
        };

        dummyGroup1.add = jest.fn();
        dummyGroup1.remove = jest.fn();
        dummyGroup2.add = jest.fn();
        dummyGroup2.remove = jest.fn();
      });

      it('should remove passed itemKey/s from old Group and add it to the new one (default config)', () => {
        collection.move('1', 'dummyGroup2', 'dummyGroup1');

        expect(dummyGroup1.add).toHaveBeenCalledWith(['1'], {});
        expect(dummyGroup1.remove).not.toHaveBeenCalled();
        expect(dummyGroup2.add).not.toHaveBeenCalled();
        expect(dummyGroup2.remove).toHaveBeenCalledWith(['1'], {});
      });

      it('should remove passed itemKey/s from old Group and add it to the new one (specific config)', () => {
        collection.move('1', 'dummyGroup2', 'dummyGroup1', {
          background: true,
          overwrite: true,
          method: 'push',
        });

        expect(dummyGroup1.add).toHaveBeenCalledWith(['1'], {
          background: true,
          overwrite: true,
          method: 'push',
        });
        expect(dummyGroup1.remove).not.toHaveBeenCalled();
        expect(dummyGroup2.add).not.toHaveBeenCalled();
        expect(dummyGroup2.remove).toHaveBeenCalledWith(['1'], {
          background: true,
          method: 'push', // Not required but passed for simplicity
          overwrite: true, // Not required but passed for simplicity
        });
      });
    });

    describe('updateItemKey function tests', () => {
      let dummySelector1: Selector<ItemInterface>;
      let dummySelector2: Selector<ItemInterface>;
      let dummySelector3: Selector<ItemInterface>;
      let dummyGroup1: Group<ItemInterface>;
      let dummyGroup2: Group<ItemInterface>;
      let dummyItem1: Item<ItemInterface>;
      let dummyItem2: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: 'dummyItem1', name: 'Jeff' });
        dummyItem1.persistent = new StatePersistent(dummyItem1);
        dummyItem2 = new Item(collection, { id: 'dummyItem2', name: 'Hans' });
        dummyItem2.persistent = new StatePersistent(dummyItem2);
        collection.data = {
          dummyItem1: dummyItem1,
          dummyItem2: dummyItem2,
        };

        dummyGroup1 = new Group(collection, ['dummyItem1', 'dummyItem2'], {
          key: 'dummyGroup1',
        });
        dummyGroup2 = new Group(collection, ['dummyItem2'], {
          key: 'dummyGroup2',
        });
        collection.groups = {
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
        };

        dummySelector1 = new Selector(collection, 'dummyItem1', {
          key: 'dummySelector1',
        });
        dummySelector2 = new Selector(collection, 'dummyItem2', {
          key: 'dummySelector2',
        });
        dummySelector3 = new Selector(collection, 'newDummyItem', {
          key: 'dummySelector3',
        });
        collection.selectors = {
          dummySelector1: dummySelector1,
          dummySelector2: dummySelector2,
          dummySelector3: dummySelector3,
        };

        dummyItem1.setKey = jest.fn();
        dummyItem2.setKey = jest.fn();
        dummyItem1.persistent.setKey = jest.fn();
        dummyItem2.persistent.setKey = jest.fn();

        dummyGroup1.replace = jest.fn();
        dummyGroup2.replace = jest.fn();

        dummySelector1.select = jest.fn();
        dummySelector2.select = jest.fn();
        dummySelector3.select = jest.fn();
        dummySelector1.reselect = jest.fn();
        dummySelector2.reselect = jest.fn();
        dummySelector3.reselect = jest.fn();
      });

      it('should update ItemKey in Collection, Selectors, Groups and Persistent (default config)', () => {
        if (dummyItem1.persistent)
          dummyItem1.persistent._key = CollectionPersistent.getItemStorageKey(
            dummyItem1._key,
            collection._key
          );

        const response = collection.updateItemKey('dummyItem1', 'newDummyItem');

        expect(response).toBeTruthy();

        expect(dummyItem1.setKey).toHaveBeenCalledWith('newDummyItem', {
          background: false,
        });
        expect(dummyItem2.setKey).not.toHaveBeenCalled();
        expect(dummyItem1.persistent?.setKey).toHaveBeenCalledWith(
          CollectionPersistent.getItemStorageKey(
            'newDummyItem',
            collection._key
          )
        );
        expect(dummyItem2.persistent?.setKey).not.toHaveBeenCalled();

        expect(dummyGroup1.replace).toHaveBeenCalledWith(
          'dummyItem1',
          'newDummyItem',
          {
            background: false,
          }
        );
        expect(dummyGroup2.replace).not.toHaveBeenCalled();

        expect(dummySelector1.select).toHaveBeenCalledWith('newDummyItem', {
          background: false,
        });
        expect(dummySelector2.select).not.toHaveBeenCalled();
        expect(dummySelector3.reselect).toHaveBeenCalledWith({
          force: true,
          background: false,
        });

        LogMock.hasNotLogged('warn');
      });

      it('should update ItemKey in Collection, Selectors, Groups and Persistent (specific config)', () => {
        if (dummyItem1.persistent)
          dummyItem1.persistent._key = CollectionPersistent.getItemStorageKey(
            dummyItem1._key,
            collection._key
          );

        const response = collection.updateItemKey(
          'dummyItem1',
          'newDummyItem',
          {
            background: true,
          }
        );

        expect(response).toBeTruthy();

        expect(dummyItem1.setKey).toHaveBeenCalledWith('newDummyItem', {
          background: true,
        });
        expect(dummyItem1.persistent?.setKey).toHaveBeenCalledWith(
          CollectionPersistent.getItemStorageKey(
            'newDummyItem',
            collection._key
          )
        );

        expect(dummyGroup1.replace).toHaveBeenCalledWith(
          'dummyItem1',
          'newDummyItem',
          {
            background: true,
          }
        );

        expect(dummySelector1.select).toHaveBeenCalledWith('newDummyItem', {
          background: true,
        });
        expect(dummySelector3.reselect).toHaveBeenCalledWith({
          force: true,
          background: true,
        });

        LogMock.hasNotLogged('warn');
      });

      it('should update ItemKey in Collection, dummy Selectors, dummy Groups and Persistent (default config)', () => {
        if (dummyItem1.persistent)
          dummyItem1.persistent._key = CollectionPersistent.getItemStorageKey(
            dummyItem1._key,
            collection._key
          );

        dummyGroup1.isPlaceholder = true;
        dummySelector1.isPlaceholder = true;

        const response = collection.updateItemKey('dummyItem1', 'newDummyItem');

        expect(response).toBeTruthy();

        expect(dummyItem1.setKey).toHaveBeenCalledWith('newDummyItem', {
          background: false,
        });
        expect(dummyItem1.persistent?.setKey).toHaveBeenCalledWith(
          CollectionPersistent.getItemStorageKey(
            'newDummyItem',
            collection._key
          )
        );

        expect(dummyGroup1.replace).toHaveBeenCalledWith(
          'dummyItem1',
          'newDummyItem',
          {
            background: false,
          }
        );

        expect(dummySelector1.select).toHaveBeenCalledWith('newDummyItem', {
          background: false,
        });
        expect(dummySelector3.reselect).toHaveBeenCalledWith({
          force: true,
          background: false,
        });

        LogMock.hasNotLogged('warn');
      });

      it(
        'should update ItemKey in Collection, Selectors, Groups ' +
          "and shouldn't update it in Persistent if persist key doesn't follow the Item Storage Key pattern (default config)",
        () => {
          if (dummyItem1.persistent)
            dummyItem1.persistent._key = 'randomPersistKey';

          const response = collection.updateItemKey(
            'dummyItem1',
            'newDummyItem'
          );

          expect(response).toBeTruthy();

          expect(dummyItem1.setKey).toHaveBeenCalledWith('newDummyItem', {
            background: false,
          });
          expect(dummyItem2.setKey).not.toHaveBeenCalled();
          expect(dummyItem1.persistent?.setKey).not.toHaveBeenCalled();
          expect(dummyItem2.persistent?.setKey).not.toHaveBeenCalled();

          expect(dummyGroup1.replace).toHaveBeenCalledWith(
            'dummyItem1',
            'newDummyItem',
            {
              background: false,
            }
          );
          expect(dummyGroup2.replace).not.toHaveBeenCalled();

          expect(dummySelector1.select).toHaveBeenCalledWith('newDummyItem', {
            background: false,
          });
          expect(dummySelector2.select).not.toHaveBeenCalled();
          expect(dummySelector3.reselect).toHaveBeenCalledWith({
            force: true,
            background: false,
          });

          LogMock.hasNotLogged('warn');
        }
      );

      it("shouldn't update ItemKey of Item that doesn't exist (default config)", () => {
        const response = collection.updateItemKey(
          'notExistingItem',
          'newDummyItem'
        );

        expect(response).toBeFalsy();
        LogMock.hasNotLogged('warn');
      });

      it("shouldn't update ItemKey if it stayed the same (default config)", () => {
        const response = collection.updateItemKey('dummyItem1', 'dummyItem1');

        expect(response).toBeFalsy();
        LogMock.hasNotLogged('warn');
      });

      it("shouldn't update ItemKey if ItemKey called after the newItemKey already exists and should print warning (default config)", () => {
        const response = collection.updateItemKey('dummyItem1', 'dummyItem2');

        expect(response).toBeFalsy();
        LogMock.hasLoggedCode('1B:03:04', [
          'dummyItem1',
          'dummyItem2',
          collection._key,
        ]);
      });
    });

    describe('getGroupKeysThatHaveItemKey function tests', () => {
      let dummyGroup1: Group<ItemInterface>;
      let dummyGroup2: Group<ItemInterface>;
      let dummyGroup3: Group<ItemInterface>;

      beforeEach(() => {
        dummyGroup1 = new Group(
          collection,
          ['dummyItem1', 'dummyItem2', 'dummyItem3'],
          {
            key: 'dummyGroup1',
          }
        );
        dummyGroup2 = new Group(collection, ['dummyItem2', 'dummyItem3'], {
          key: 'dummyGroup2',
        });
        dummyGroup3 = new Group(collection, ['dummyItem3'], {
          key: 'dummyGroup3',
        });
        collection.groups = {
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
          dummyGroup3: dummyGroup3,
        };
      });

      it('should return groupKeys that contain ItemKey', () => {
        expect(
          collection.getGroupKeysThatHaveItemKey('unknownItem')
        ).toStrictEqual([]);
        expect(
          collection.getGroupKeysThatHaveItemKey('dummyItem1')
        ).toStrictEqual(['dummyGroup1']);
        expect(
          collection.getGroupKeysThatHaveItemKey('dummyItem2')
        ).toStrictEqual(['dummyGroup1', 'dummyGroup2']);
        expect(
          collection.getGroupKeysThatHaveItemKey('dummyItem3')
        ).toStrictEqual(['dummyGroup1', 'dummyGroup2', 'dummyGroup3']);
      });
    });

    describe('remove function tests', () => {
      beforeEach(() => {
        collection.removeFromGroups = jest.fn();
        collection.removeItems = jest.fn();
      });

      it('should remove Items from Group', () => {
        collection
          .remove(['test1', 'test2'])
          .fromGroups(['testGroup1', 'testGroup2']);

        expect(collection.removeFromGroups).toHaveBeenCalledWith(
          ['test1', 'test2'],
          ['testGroup1', 'testGroup2']
        );
        expect(collection.removeItems).not.toHaveBeenCalled();
      });

      it('should remove Items from everywhere (default config)', () => {
        collection.remove(['test1', 'test2']).everywhere();

        expect(collection.removeFromGroups).not.toHaveBeenCalled();
        expect(collection.removeItems).toHaveBeenCalledWith(
          ['test1', 'test2'],
          {}
        );
      });

      it('should remove Items from everywhere (specific config)', () => {
        collection
          .remove(['test1', 'test2'])
          .everywhere({ removeSelector: true, notExisting: true });

        expect(collection.removeFromGroups).not.toHaveBeenCalled();
        expect(collection.removeItems).toHaveBeenCalledWith(
          ['test1', 'test2'],
          { removeSelector: true, notExisting: true }
        );
      });
    });

    describe('removeFromGroups function tests', () => {
      let dummyGroup1: Group<ItemInterface>;
      let dummyGroup2: Group<ItemInterface>;
      let dummyGroup3: Group<ItemInterface>;

      beforeEach(() => {
        dummyGroup1 = new Group(
          collection,
          ['dummyItem1', 'dummyItem2', 'dummyItem3', 'unknownItem'],
          {
            key: 'dummyGroup1',
          }
        );
        dummyGroup2 = new Group(
          collection,
          ['dummyItem2', 'dummyItem3', 'unknownItem'],
          {
            key: 'dummyGroup2',
          }
        );
        dummyGroup3 = new Group(collection, ['dummyItem3', 'unknownItem'], {
          key: 'dummyGroup3',
        });
        collection.groups = {
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
          dummyGroup3: dummyGroup3,
        };

        collection.removeItems = jest.fn();
        dummyGroup1.remove = jest.fn();
        dummyGroup2.remove = jest.fn();
        dummyGroup3.remove = jest.fn();
      });

      it('should remove ItemKey from Group', () => {
        collection.removeFromGroups('dummyItem2', 'dummyGroup1');

        expect(collection.removeItems).not.toHaveBeenCalled();
        expect(dummyGroup1.remove).toHaveBeenCalledWith('dummyItem2');
        expect(dummyGroup2.remove).not.toHaveBeenCalled();
        expect(dummyGroup3.remove).not.toHaveBeenCalled();
      });

      it('should remove ItemKeys from Groups', () => {
        collection.removeFromGroups(
          ['dummyItem2', 'dummyItem3'],
          ['dummyGroup2', 'dummyGroup3']
        );

        expect(collection.removeItems).not.toHaveBeenCalled();
        expect(dummyGroup1.remove).not.toHaveBeenCalled();
        expect(dummyGroup2.remove).toHaveBeenCalledWith('dummyItem2');
        expect(dummyGroup2.remove).toHaveBeenCalledWith('dummyItem3');
        expect(dummyGroup3.remove).not.toHaveBeenCalledWith('dummyItem2');
        expect(dummyGroup3.remove).toHaveBeenCalledWith('dummyItem3');
      });

      it('should remove Item from Collection if it got removed from all Groups in which it was in', () => {
        collection.removeFromGroups('dummyItem2', [
          'dummyGroup2',
          'dummyGroup1',
        ]);

        expect(collection.removeItems).toHaveBeenCalledWith('dummyItem2');
        expect(dummyGroup1.remove).toHaveBeenCalledWith('dummyItem2');
        expect(dummyGroup2.remove).toHaveBeenCalledWith('dummyItem2');
      });
    });

    describe('removeItems function test', () => {
      let dummySelector1: Selector<ItemInterface>;
      let dummySelector2: Selector<ItemInterface>;
      let dummyGroup1: Group<ItemInterface>;
      let dummyGroup2: Group<ItemInterface>;
      let dummyItem1: Item<ItemInterface>;
      let dummyItem2: Item<ItemInterface>;
      let placeholderItem: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: 'dummyItem1', name: 'Jeff' });
        dummyItem1.persistent = new StatePersistent(dummyItem1);
        dummyItem2 = new Item(collection, { id: 'dummyItem2', name: 'Hans' });
        dummyItem2.persistent = new StatePersistent(dummyItem2);
        placeholderItem = new Item(
          collection,
          { id: 'placeholderItem', name: 'placeholder' },
          { isPlaceholder: true }
        );
        collection.data = {
          dummyItem1: dummyItem1,
          dummyItem2: dummyItem2,
          placeholderItem: placeholderItem,
        };
        collection.size = 2;

        dummyGroup1 = new Group(collection, ['dummyItem1', 'dummyItem2'], {
          key: 'dummyGroup1',
        });
        dummyGroup2 = new Group(collection, ['dummyItem2'], {
          key: 'dummyGroup2',
        });
        collection.groups = {
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
        };

        dummySelector1 = new Selector(collection, 'dummyItem1', {
          key: 'dummySelector1',
        });
        dummySelector2 = new Selector(collection, 'dummyItem2', {
          key: 'dummySelector2',
        });
        collection.selectors = {
          dummySelector1: dummySelector1,
          dummySelector2: dummySelector2,
        };

        dummyItem1.persistent.removePersistedValue = jest.fn();
        dummyItem2.persistent.removePersistedValue = jest.fn();

        dummyGroup1.remove = jest.fn();
        dummyGroup2.remove = jest.fn();

        dummySelector1.reselect = jest.fn();
        dummySelector2.reselect = jest.fn();

        collection.removeSelector = jest.fn();
      });

      it('should remove Item from Collection, Groups and reselect Selectors (default config)', () => {
        collection.removeItems('dummyItem1');

        expect(collection.data).not.toHaveProperty('dummyItem1');
        expect(collection.data).toHaveProperty('dummyItem2');
        expect(collection.size).toBe(1);
        expect(collection.removeSelector).not.toHaveBeenCalled();

        expect(dummyItem1.persistent?.removePersistedValue).toHaveBeenCalled();
        expect(
          dummyItem2.persistent?.removePersistedValue
        ).not.toHaveBeenCalled();

        expect(dummyGroup1.remove).toHaveBeenCalledWith('dummyItem1');
        expect(dummyGroup2.remove).not.toHaveBeenCalled();

        expect(dummySelector1.reselect).toHaveBeenCalledWith({
          force: true,
        });
        expect(dummySelector2.reselect).not.toHaveBeenCalled();
      });

      it('should remove Items from Collection, Groups and reselect Selectors (default config)', () => {
        collection.removeItems(['dummyItem1', 'dummyItem2', 'notExistingItem']);

        expect(collection.data).not.toHaveProperty('dummyItem1');
        expect(collection.data).not.toHaveProperty('dummyItem2');
        expect(collection.size).toBe(0);
        expect(collection.removeSelector).not.toHaveBeenCalled();

        expect(dummyItem1.persistent?.removePersistedValue).toHaveBeenCalled();
        expect(dummyItem2.persistent?.removePersistedValue).toHaveBeenCalled();

        expect(dummyGroup1.remove).toHaveBeenCalledWith('dummyItem1');
        expect(dummyGroup1.remove).toHaveBeenCalledWith('dummyItem2');
        expect(dummyGroup2.remove).not.toHaveBeenCalledWith('dummyItem1');
        expect(dummyGroup2.remove).toHaveBeenCalledWith('dummyItem2');

        expect(dummySelector1.reselect).toHaveBeenCalledWith({
          force: true,
        });
        expect(dummySelector2.reselect).toHaveBeenCalledWith({
          force: true,
        });
      });

      it('should remove Item from Collection, Groups and remove Selectors (removeSelector = true)', () => {
        collection.removeItems('dummyItem1', { removeSelector: true });

        expect(collection.data).not.toHaveProperty('dummyItem1');
        expect(collection.data).toHaveProperty('dummyItem2');
        expect(collection.size).toBe(1);
        expect(collection.removeSelector).toHaveBeenCalledTimes(1);
        expect(collection.removeSelector).toHaveBeenCalledWith(
          dummySelector1._key
        );

        expect(dummyItem1.persistent?.removePersistedValue).toHaveBeenCalled();
        expect(
          dummyItem2.persistent?.removePersistedValue
        ).not.toHaveBeenCalled();

        expect(dummyGroup1.remove).toHaveBeenCalledWith('dummyItem1');
        expect(dummyGroup2.remove).not.toHaveBeenCalled();

        expect(dummySelector1.reselect).not.toHaveBeenCalled();
        expect(dummySelector2.reselect).not.toHaveBeenCalled();
      });

      it("shouldn't remove placeholder Items from Collection (default config)", () => {
        collection.removeItems(['dummyItem1', 'placeholderItem']);

        expect(collection.data).toHaveProperty('placeholderItem');
        expect(collection.data).not.toHaveProperty('dummyItem1');
        expect(collection.size).toBe(1);
      });

      it('should remove placeholder Items from Collection (config.notExisting = true)', () => {
        collection.removeItems(['dummyItem1', 'placeholderItem'], {
          notExisting: true,
        });

        expect(collection.data).not.toHaveProperty('placeholderItem');
        expect(collection.data).not.toHaveProperty('dummyItem1');
        expect(collection.size).toBe(1);
      });
    });

    describe('assignData function tests', () => {
      let dummyItem1: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: 'dummyItem1', name: 'Jeff' });
        collection.data = {
          dummyItem1: dummyItem1,
        };
        collection.size = 1;

        jest.spyOn(collection, 'assignItem');

        dummyItem1.patch = jest.fn();
        dummyItem1.set = jest.fn();
      });

      it("should assign Item to Collection if it doesn't exist yet (default config)", () => {
        const response = collection.assignData({
          id: 'dummyItem2',
          name: 'Hans',
        });

        expect(response).toBeTruthy();
        expect(collection.size).toBe(2); // Increased by assignItem()
        expect(collection.assignItem).toHaveBeenCalledWith(expect.any(Item), {
          background: false,
        });

        // Check if Item, assignItem() was called with, has the correct data
        expect(collection.data).toHaveProperty('dummyItem2');
        expect(collection.data['dummyItem2']._value).toStrictEqual({
          id: 'dummyItem2',
          name: 'Hans',
        });

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });

      it("should assign Item to Collection if it doesn't exist yet (config.background = true)", () => {
        const response = collection.assignData(
          {
            id: 'dummyItem2',
            name: 'Hans',
          },
          { background: true }
        );

        expect(response).toBeTruthy();
        expect(collection.size).toBe(2); // Increased by assignItem()
        expect(collection.assignItem).toHaveBeenCalledWith(expect.any(Item), {
          background: true,
        });

        // Check if Item, assignItem() was called with, has the correct data
        expect(collection.data).toHaveProperty('dummyItem2');
        expect(collection.data['dummyItem2']._value).toStrictEqual({
          id: 'dummyItem2',
          name: 'Hans',
        });

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });

      it("shouldn't assign or update Item if passed data is no valid object", () => {
        const response = collection.assignData('noObject' as any);

        expect(response).toBeFalsy();
        expect(collection.size).toBe(1);
        expect(collection.assignItem).not.toHaveBeenCalled();

        LogMock.hasLoggedCode('1B:03:05', [collection._key]);
        LogMock.hasNotLogged('warn');
      });

      it("should assign Item to Collection with random itemKey if data object doesn't contain valid itemKey", () => {
        jest.spyOn(Utils, 'generateId').mockReturnValueOnce('randomDummyId');

        const response = collection.assignData({ name: 'Frank' } as any);

        expect(response).toBeTruthy();
        expect(collection.size).toBe(2); // Increased by assignItem()
        expect(collection.assignItem).toHaveBeenCalledWith(expect.any(Item), {
          background: false,
        });

        // Check if Item, assignItem() was called with, has the correct data
        expect(collection.data).toHaveProperty('randomDummyId');
        expect(collection.data['randomDummyId']._value).toStrictEqual({
          id: 'randomDummyId',
          name: 'Frank',
        });

        LogMock.hasNotLogged('error');
        LogMock.hasLoggedCode('1B:02:05', [
          collection._key,
          collection.config.primaryKey,
        ]);
      });

      it('should update existing Item with valid data via set (default config)', () => {
        const response = collection.assignData({
          id: 'dummyItem1',
          name: 'Dieter',
        });

        expect(response).toBeTruthy();
        expect(collection.size).toBe(1);
        expect(collection.assignItem).not.toHaveBeenCalled();

        expect(dummyItem1.set).toHaveBeenCalledWith(
          { id: 'dummyItem1', name: 'Dieter' },
          { background: false }
        );
        expect(dummyItem1.patch).not.toHaveBeenCalled();

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });

      it('should update existing Item with valid data via set (config.background = true)', () => {
        const response = collection.assignData(
          {
            id: 'dummyItem1',
            name: 'Dieter',
          },
          { background: true }
        );

        expect(response).toBeTruthy();
        expect(collection.size).toBe(1);
        expect(collection.assignItem).not.toHaveBeenCalled();

        expect(dummyItem1.set).toHaveBeenCalledWith(
          { id: 'dummyItem1', name: 'Dieter' },
          { background: true }
        );
        expect(dummyItem1.patch).not.toHaveBeenCalled();

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });

      it('should update existing Item with valid data via patch (config.patch = true, background: true)', () => {
        const response = collection.assignData(
          {
            id: 'dummyItem1',
            name: 'Dieter',
          },
          { patch: true, background: true }
        );

        expect(response).toBeTruthy();
        expect(collection.size).toBe(1);
        expect(collection.assignItem).not.toHaveBeenCalled();

        expect(dummyItem1.set).not.toHaveBeenCalled();
        expect(dummyItem1.patch).toHaveBeenCalledWith(
          { id: 'dummyItem1', name: 'Dieter' },
          { background: true }
        );

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });

      it('should update placeholder Item with valid data and increase Collection size (default config)', () => {
        dummyItem1.isPlaceholder = true;

        const response = collection.assignData({
          id: 'dummyItem1',
          name: 'Dieter',
        });

        expect(response).toBeTruthy();
        expect(collection.size).toBe(2);
        expect(collection.assignItem).not.toHaveBeenCalled();

        expect(dummyItem1.set).toHaveBeenCalledWith(
          { id: 'dummyItem1', name: 'Dieter' },
          { background: false }
        );
        expect(dummyItem1.patch).not.toHaveBeenCalled();

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });
    });

    describe('assignItem function tests', () => {
      let dummyItem1: Item<ItemInterface>;
      let toAddDummyItem2: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: 'dummyItem1', name: 'Jeff' });
        toAddDummyItem2 = new Item(collection, {
          id: 'dummyItem2',
          name: 'Frank',
        });
        collection.data = {
          dummyItem1: dummyItem1,
        };
        collection.size = 1;

        dummyItem1.patch = jest.fn();
        toAddDummyItem2.patch = jest.fn();
        collection.rebuildGroupsThatIncludeItemKey = jest.fn();
        collection.assignData = jest.fn();
      });

      it('should assign valid Item to the Collection (default config)', () => {
        const response = collection.assignItem(toAddDummyItem2);

        expect(response).toBeTruthy();
        expect(collection.size).toBe(2);
        expect(collection.data).toHaveProperty('dummyItem2');
        expect(collection.data['dummyItem2']).toBe(toAddDummyItem2);
        expect(collection.rebuildGroupsThatIncludeItemKey).toHaveBeenCalledWith(
          'dummyItem2',
          {
            background: false,
          }
        );
        expect(collection.assignData).not.toHaveBeenCalled();

        expect(toAddDummyItem2.patch).not.toHaveBeenCalled();
        expect(toAddDummyItem2._key).toBe('dummyItem2');

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });

      it('should assign valid Item to the Collection (specific config)', () => {
        const response = collection.assignItem(toAddDummyItem2, {
          background: true,
          rebuildGroups: false,
        });

        expect(response).toBeTruthy();
        expect(collection.size).toBe(2);
        expect(collection.data).toHaveProperty('dummyItem2');
        expect(collection.data['dummyItem2']).toBe(toAddDummyItem2);
        expect(
          collection.rebuildGroupsThatIncludeItemKey
        ).not.toHaveBeenCalled();
        expect(collection.assignData).not.toHaveBeenCalled();

        expect(toAddDummyItem2.patch).not.toHaveBeenCalled();
        expect(toAddDummyItem2._key).toBe('dummyItem2');

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });

      it("should assign Item to Collection with random itemKey if data object doesn't contain valid itemKey (default config)", () => {
        jest.spyOn(Utils, 'generateId').mockReturnValueOnce('randomDummyId');
        toAddDummyItem2._value = { dummy: 'data' } as any;
        toAddDummyItem2._key = undefined;

        const response = collection.assignItem(toAddDummyItem2);

        expect(response).toBeTruthy();
        expect(collection.size).toBe(2);
        expect(collection.data).toHaveProperty('randomDummyId');
        expect(collection.data['randomDummyId']).toBe(toAddDummyItem2);
        expect(collection.rebuildGroupsThatIncludeItemKey).toHaveBeenCalledWith(
          'randomDummyId',
          {
            background: false,
          }
        );
        expect(collection.assignData).not.toHaveBeenCalled();

        expect(toAddDummyItem2.patch).toHaveBeenCalledWith(
          { id: 'randomDummyId' },
          { background: false }
        );
        expect(toAddDummyItem2._key).toBe('randomDummyId');

        LogMock.hasNotLogged('error');
        LogMock.hasLoggedCode('1B:02:05', [
          collection._key,
          collection.config.primaryKey,
        ]);
      });

      it("shouldn't assign Item to Collection that belongs to another Collection", () => {
        const anotherCollection = new Collection<ItemInterface>(dummyAgile, {
          key: 'anotherCollection',
        });
        toAddDummyItem2.collection = () => anotherCollection;

        const response = collection.assignItem(toAddDummyItem2);

        expect(response).toBeFalsy();
        expect(collection.size).toBe(1);
        expect(collection.data).not.toHaveProperty('dummyItem2');
        expect(
          collection.rebuildGroupsThatIncludeItemKey
        ).not.toHaveBeenCalled();
        expect(collection.assignData).not.toHaveBeenCalled();

        expect(toAddDummyItem2.patch).not.toHaveBeenCalled();
        expect(toAddDummyItem2._key).toBe('dummyItem2');

        LogMock.hasLoggedCode('1B:03:06', [
          collection._key,
          anotherCollection._key,
        ]);
        LogMock.hasNotLogged('warn');
      });

      it("shouldn't assign Item to Collection if an Item at itemKey already exists (default config)", () => {
        const response = collection.assignItem(dummyItem1);

        expect(response).toBeTruthy();
        expect(collection.size).toBe(1);
        expect(collection.data).toHaveProperty('dummyItem1');
        expect(collection.data['dummyItem1']).toBe(dummyItem1);
        expect(
          collection.rebuildGroupsThatIncludeItemKey
        ).not.toHaveBeenCalled();
        expect(collection.assignData).toHaveBeenCalledWith(dummyItem1._value);

        expect(dummyItem1.patch).not.toHaveBeenCalled();
        expect(dummyItem1._key).toBe('dummyItem1');

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });

      it('should assign Item to Collection if an Item at itemKey already exists (config.overwrite = true)', () => {
        const response = collection.assignItem(dummyItem1, { overwrite: true });

        expect(response).toBeTruthy();
        expect(collection.size).toBe(1);
        expect(collection.data).toHaveProperty('dummyItem1');
        expect(collection.data['dummyItem1']).toBe(dummyItem1);
        expect(collection.rebuildGroupsThatIncludeItemKey).toHaveBeenCalledWith(
          'dummyItem1',
          {
            background: false,
          }
        );
        expect(collection.assignData).not.toHaveBeenCalled();

        expect(dummyItem1.patch).not.toHaveBeenCalled();
        expect(dummyItem1._key).toBe('dummyItem1');

        LogMock.hasNotLogged('error');
        LogMock.hasNotLogged('warn');
      });
    });

    describe('rebuildGroupsThatIncludeItemKey function tests', () => {
      let dummyGroup1: Group<ItemInterface>;
      let dummyGroup2: Group<ItemInterface>;

      let dummyItem1: Item<ItemInterface>;
      let dummyItem2: Item<ItemInterface>;

      beforeEach(() => {
        dummyItem1 = new Item(collection, { id: 'dummyItem1', name: 'Jeff' });
        dummyItem2 = new Item(collection, { id: 'dummyItem2', name: 'Jeff' });
        collection.data = {
          dummyItem1: dummyItem1,
          dummyItem2: dummyItem2,
        };

        dummyGroup1 = new Group(
          collection,
          ['dummyItem1', 'missingInCollectionItemKey', 'dummyItem2'],
          {
            key: 'dummyGroup1',
          }
        );
        dummyGroup2 = new Group(collection, ['dummyItem2'], {
          key: 'dummyGroup2',
        });
        collection.groups = {
          dummyGroup1: dummyGroup1,
          dummyGroup2: dummyGroup2,
        };

        dummyGroup1.rebuild = jest.fn();
        dummyGroup2.rebuild = jest.fn();
      });

      it('should update the Item in each Group (output) that includes the specified itemKey (default config)', () => {
        collection.rebuildGroupsThatIncludeItemKey('dummyItem1');

        // Group 1
        expect(dummyGroup1.rebuild).toHaveBeenCalledWith(
          [
            {
              key: 'dummyItem1',
              index: 0,
              method: TrackedChangeMethod.UPDATE,
            },
          ],
          {}
        );

        // Group 2
        expect(dummyGroup2.rebuild).not.toHaveBeenCalled();
      });

      it('should update the Item in each Group (output) that includes the specified itemKey (specific config)', () => {
        collection.rebuildGroupsThatIncludeItemKey('dummyItem2', {
          key: 'frank',
          background: true,
          force: true,
        });

        // Group 1
        expect(dummyGroup1.rebuild).toHaveBeenCalledWith(
          [
            {
              key: 'dummyItem2',
              index: 1,
              method: TrackedChangeMethod.UPDATE,
            },
          ],
          {
            key: 'frank',
            background: true,
            force: true,
          }
        );

        // Group 2
        expect(dummyGroup2.rebuild).toHaveBeenCalledWith(
          [
            {
              key: 'dummyItem2',
              index: 0,
              method: TrackedChangeMethod.UPDATE,
            },
          ],
          {
            key: 'frank',
            background: true,
            force: true,
          }
        );
      });

      it(
        'should update the Item in each Group (output) that includes the specified itemKey ' +
          "although the Item doesn't exist in the Group output yet",
        () => {
          collection.rebuildGroupsThatIncludeItemKey(
            'missingInCollectionItemKey'
          );

          // Group 1
          expect(dummyGroup1.rebuild).toHaveBeenCalledWith(
            [
              {
                key: 'missingInCollectionItemKey',
                index: 1,
                method: TrackedChangeMethod.ADD,
              },
            ],
            {}
          );

          // Group 2
          expect(dummyGroup2.rebuild).not.toHaveBeenCalled();
        }
      );
    });
  });
});
