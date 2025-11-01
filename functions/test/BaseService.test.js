import { assert } from 'chai';
import sinon from 'sinon';
import { BaseService } from '../src/Shared/Services/BaseService.js';
import MockImageService from './helpers/MockImagesService.js';

// Mock de Firestore usando un objeto simple
const mockFirestore = {
    collection: function(name) {
        return mockCollection;
    }
};

// Mock de Collection
const mockCollection = {
    doc: function(id) {
        return mockDocument;
    },
    where: function() {
        return this;
    },
    add: function(data) {
        return Promise.resolve({ id: 'mock-id' });
    },
    get: function() {
        return Promise.resolve({
            empty: false,
            docs: [
                {
                    id: 'doc1',
                    data: () => ({ title: 'Test 1', deletedAt: null })
                }
            ]
        });
    }
};

// Mock de Document
const mockDocument = {
    get: function() {
        return Promise.resolve({
            exists: true,
            id: 'test-id',
            data: () => ({
                title: 'Test Document',
                deletedAt: null
            })
        });
    },
    update: function(data) {
        return Promise.resolve();
    },
    delete: function() {
        return Promise.resolve();
    }
};

// Mock de FieldValue
const mockFieldValue = {
    serverTimestamp: () => 'TIMESTAMP'
};

// Espías para los servicios de imagen
const oldImagesHandlerSpy = sinon.spy(MockImageService.oldImagesHandler);
const deleteImageSpy = sinon.spy(MockImageService.deleteImage);

// Estructura de Mock de Documento y Colección
class MockDocRef {
    constructor(id, data = null, exists = true) {
        this.id = id;
        this.data = data;
        this.exists = exists;
    }
    get = sinon.stub().callsFake(async () => {
        return { 
            exists: this.exists, 
            data: () => this.data, 
            id: this.id 
        };
    });
    update = sinon.stub().resolves();
    delete = sinon.stub().resolves();
}

class MockCollection {
    constructor(name) {
        this.name = name;
        this.dataStore = {}; // Almacenamiento simulado
    }
    doc = sinon.stub().callsFake((id) => {
        const data = this.dataStore[id] || null;
        return new MockDocRef(id, data, !!data);
    });
    add = sinon.stub().callsFake(async (data) => {
        const newId = 'mockId-' + Math.random().toString(36).substring(7);
        this.dataStore[newId] = data;
        return new MockDocRef(newId, data, true);
    });
    // Simulación de la función where() para la comprobación de unicidad
    where = sinon.stub().returns({
        where: sinon.stub().returns({
            get: sinon.stub().resolves({
                empty: true, // Por defecto, no hay duplicados
                docs: []
            })
        })
    });
    get = sinon.stub().resolves({
        empty: false,
        docs: [
            new MockDocRef('doc1', { title: 'T1', deletedAt: null }),
            new MockDocRef('doc2', { title: 'T2', deletedAt: null }),
        ].map(ref => ({ id: ref.id, data: ref.data }))
    });
}

describe('BaseService', () => {
    let service;
    const testCollection = 'test_products';
    const imageFieldName = 'imgUrl';
    
    beforeEach(() => {
        // Preparar los mocks para cada test
        global.getFirestore = () => mockFirestore;
        global.FieldValue = mockFieldValue;
        
        service = new BaseService(testCollection, true, imageFieldName, MockImageService);
        
        // Crear espías para los métodos de MockImageService
        sinon.spy(MockImageService, 'oldImagesHandler');
        sinon.spy(MockImageService, 'deleteImage');
    });

    afterEach(() => {
        // Limpiar los espías
        sinon.restore();
        delete global.getFirestore;
        delete global.FieldValue;
    });

    describe('create()', () => {
        const createData = { 
            title: 'Nueva Cabaña', 
            [imageFieldName]: 'temp/new.jpg' 
        };

        it('debería crear un documento con campos timestamp y deletedAt', async () => {
            const mockAdd = sinon.stub(service.collection, 'add').resolves({ id: 'newId' });
            
            await service.create(createData);

            assert.isTrue(mockAdd.calledOnce);
            const addedData = mockAdd.firstCall.args[0];
            assert.equal(addedData.title, createData.title);
            assert.exists(addedData.createdAt, 'Debe contener createdAt');
            assert.exists(addedData.updatedAt, 'Debe contener updatedAt');
            assert.isNull(addedData.deletedAt);
        });

        it('debería verificar duplicados cuando se proporciona uniqueField', async () => {
            const uniqueFieldName = 'title';
            const whereMock = {
                where: sinon.stub().returnsThis(),
                get: sinon.stub().resolves({ empty: false })
            };
            service.collection.where = sinon.stub().returns(whereMock);

            try {
                await service.create(createData, uniqueFieldName);
                assert.fail('Debería haber lanzado un error por duplicado');
            } catch (error) {
                assert.include(error.message, 'already exists');
            }
        });

        it('debería manejar imágenes cuando useImg es true', async () => {
            const mockAdd = sinon.stub(service.collection, 'add').resolves({ id: 'newId' });
            
            await service.create(createData, null, true);

            assert.isTrue(MockImageService.deleteImage.calledOnce);
            assert.isTrue(MockImageService.deleteImage.calledWith(createData[imageFieldName]));
        });
    });

    describe('update()', () => {
        const updateId = 'updateTestId';
        const oldData = { 
            title: 'Viejo Título', 
            [imageFieldName]: 'storage/old.jpg', 
            deletedAt: null 
        };
        const newData = { 
            title: 'Nuevo Título', 
            [imageFieldName]: 'storage/new.jpg' 
        };
        
        beforeEach(() => {
            const docRef = {
            update: sinon.stub().resolves(),
            get: sinon.stub()
                .onFirstCall().resolves({
                exists: true,
                data: () => oldData,
                id: updateId
                })
                .onSecondCall().resolves({
                exists: true,
                data: () => ({ ...newData, updatedAt: 'TIMESTAMP' }),
                id: updateId
                })
            };
            service.collection.doc = sinon.stub().returns(docRef);
        });

        it('debería validar existencia del documento', async () => {
            service.collection.doc().get = sinon.stub().resolves({
                exists: false
            });

            try {
                await service.update(updateId, newData);
                assert.fail('Debería haber lanzado error por documento no existente');
            } catch (error) {
                assert.include(error.message, 'not found');
            }
        });

        it('debería actualizar timestamps y manejar imágenes', async () => {
            const result = await service.update(updateId, newData, true, false);

            assert.isTrue(service.collection.doc().update.calledOnce);
            const updateData = service.collection.doc().update.firstCall.args[0];
            assert.exists(updateData.updatedAt, 'Debe contener updatedAt');

            assert.isTrue(MockImageService.oldImagesHandler.calledOnce);
            assert.isTrue(MockImageService.oldImagesHandler.calledWith(oldData[imageFieldName], false));
        });

        it('NO debería llamar a oldImagesHandler si la imagen no cambia', async () => {
            const sameImageData = { 
                title: 'Nuevo Título', 
                [imageFieldName]: oldData[imageFieldName] 
            };
            
            await service.update(updateId, sameImageData);

            assert.isFalse(MockImageService.oldImagesHandler.called);
        });
    });

    describe('getById()', () => {
        const testId = 'testId';
        const testData = { 
            title: 'Test Document',
            [imageFieldName]: 'storage/test.jpg',
            deletedAt: null
        };

        beforeEach(() => {
            const docRef = {
                get: sinon.stub().resolves({
                    exists: true,
                    data: () => testData,
                    id: testId
                })
            };
            service.collection.doc = sinon.stub().returns(docRef);
        });

        it('debería retornar documento si existe y no está borrado', async () => {
            const result = await service.getById(testId);

            assert.equal(result.id, testId);
            assert.equal(result.title, testData.title);
            assert.equal(result[imageFieldName], testData[imageFieldName]);
        });

        it('debería lanzar 404 si el documento tiene deletedAt', async () => {
            service.collection.doc().get = sinon.stub().resolves({
                exists: true,
                data: () => ({...testData, deletedAt: 'TIMESTAMP'}),
                id: testId
            });

            try {
                await service.getById(testId);
                assert.fail('Debería haber lanzado error 404');
            } catch (error) {
                assert.include(error.message, 'not found');
            }
        });

        it('debería lanzar 404 si el documento no existe', async () => {
            service.collection.doc().get = sinon.stub().resolves({
                exists: false
            });

            try {
                await service.getById(testId);
                assert.fail('Debería haber lanzado error 404');
            } catch (error) {
                assert.include(error.message, 'not found');
            }
        });
    });

    describe('getAll()', () => {
        it('debería retornar todos los documentos no borrados', async () => {
            const mockDocs = [
                { id: 'doc1', data: () => ({ title: 'Doc 1', deletedAt: null }) },
                { id: 'doc2', data: () => ({ title: 'Doc 2', deletedAt: null }) }
            ];
            
            const whereMock = {
                get: sinon.stub().resolves({
                    empty: false,
                    docs: mockDocs
                })
            };
            service.collection.where = sinon.stub().returns(whereMock);

            const result = await service.getAll();

            assert.isArray(result);
            assert.equal(result.length, 2);
            assert.equal(result[0].title, 'Doc 1');
            assert.equal(result[1].title, 'Doc 2');
        });

        it('debería lanzar 404 si no hay documentos', async () => {
            const whereMock = {
                get: sinon.stub().resolves({
                    empty: true,
                    docs: []
                })
            };
            service.collection.where = sinon.stub().returns(whereMock);

            try {
                await service.getAll();
                assert.fail('Debería haber lanzado error 404');
            } catch (error) {
                assert.include(error.message, 'empty');
            }
        });
    });

    describe('delete()', () => {
        const deleteId = 'deleteId';
        const deleteData = {
            title: 'To Delete',
            [imageFieldName]: 'storage/delete.jpg',
            deletedAt: null
        };

        beforeEach(() => {
            const docRef = {
                get: sinon.stub().resolves({
                    exists: true,
                    data: () => deleteData,
                    id: deleteId
                }),
                delete: sinon.stub().resolves()
            };
            service.collection.doc = sinon.stub().returns(docRef);
        });

        it('debería eliminar documento y manejar imagen', async () => {
            const result = await service.delete(deleteId);

            assert.isTrue(service.collection.doc().delete.calledOnce);
            assert.isTrue(MockImageService.oldImagesHandler.calledWith(deleteData[imageFieldName], false));
            assert.include(result, 'deleted successfully');
        });

        it('debería lanzar 404 si el documento no existe', async () => {
            service.collection.doc().get = sinon.stub().resolves({
                exists: false
            });

            try {
                await service.delete(deleteId);
                assert.fail('Debería haber lanzado error 404');
            } catch (error) {
                assert.include(error.message, 'not found');
            }
        });
    });
});