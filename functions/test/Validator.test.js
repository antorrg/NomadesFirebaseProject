import { assert } from 'chai';
import sinon from 'sinon';
import { Validator } from "../src/Shared/Validator/Validator.js";
import { AuxValid } from "../src/Shared/Validator/helpers/auxValid.js";

describe('Validator', () => {
    describe('validatorBody', () => {
        it('debería validar un objeto simple correctamente', () => {
            const data = {
                name: 'John',
                age: 25
            };
            const schema = {
                name: { type: 'string' },
                age: { type: 'int' }
            };
            const result = Validator.validatorBody(data, schema);
            assert.deepEqual(result, data);
        });

        it('debería lanzar error con datos inválidos', () => {
            const data = {
                name: 123,  // debería ser string
                age: '25'   // debería ser int
            };
            const schema = {
                name: { type: 'string' },
                age: { type: 'int' }
            };
            assert.throws(() => Validator.validatorBody(data, schema));
        });

        it('debería manejar valores por defecto', () => {
            const data = {
                name: 'John'
            };
            const schema = {
                name: { type: 'string' },
                age: { type: 'int', default: 18 }
            };
            const result = Validator.validatorBody(data, schema);
            assert.equal(result.age, 18);
        });

        it('debería validar arrays correctamente', () => {
            const data = {
                tags: ['javascript', 'testing', 'validation']
            };
            const schema = {
                tags: [{ type: 'string' }]
            };
            const result = Validator.validatorBody(data, schema);
            assert.deepEqual(result, data);
        });
    });

    describe('validateRegex', () => {
        it('debería validar un email correcto', () => {
            const data = { email: 'test@example.com' };
            const result = Validator.validateRegex(data, Validator.ValidReg.EMAIL, 'email');
            assert.deepEqual(result, data);
        });

        it('debería validar una contraseña correcta', () => {
            const data = { password: 'Password123' };
            const result = Validator.validateRegex(data, Validator.ValidReg.PASSWORD, 'password');
            assert.deepEqual(result, data);
        });

        it('debería lanzar error con email inválido', () => {
            const data = { email: 'invalid-email' };
            assert.throws(() => 
                Validator.validateRegex(data, Validator.ValidReg.EMAIL, 'email'),
                /Invalid email format/
            );
        });

        it('debería incluir mensaje personalizado en el error', () => {
            const data = { email: 'invalid-email' };
            const customMessage = 'Por favor use un email válido';
            assert.throws(() => 
                Validator.validateRegex(data, Validator.ValidReg.EMAIL, 'email', customMessage),
                new RegExp(customMessage)
            );
        });
    });

    describe('paramId', () => {
        it('debería validar un ID de Firebase válido', () => {
            const params = { productId: 'abc123DEF456GHI78xyz' };
            const result = Validator.paramId(params, 'productId', Validator.ValidReg.FIREBASE_ID);
            assert.equal(result, params.productId);
        });

        it('debería validar un UUID v4 válido', () => {
            const params = { userId: '123e4567-e89b-42d3-a456-556642440000' };
            const result = Validator.paramId(params, 'userId', Validator.ValidReg.UUIDv4);
            assert.equal(result, params.userId);
        });

        it('debería lanzar error con ID inválido', () => {
            const params = { productId: 'invalid-id' };
            assert.throws(() => 
                Validator.paramId(params, 'productId', Validator.ValidReg.FIREBASE_ID),
                /Invalid parameters/
            );
        });

        it('debería lanzar error cuando falta el ID', () => {
            const params = {};
            assert.throws(() => 
                Validator.paramId(params, 'productId', Validator.ValidReg.FIREBASE_ID),
                /Missing productId/
            );
        });
    });

    describe('ValidReg patterns', () => {
        const testCases = [
            {
                pattern: 'EMAIL',
                valid: ['test@example.com', 'user.name@domain.co.uk'],
                invalid: ['test@', 'test@.com', '@domain.com', 'testdomain.com']
            },
            {
                pattern: 'PASSWORD',
                valid: ['Password123', 'SecurePass1'],
                invalid: ['password', 'pass', '12345678', 'lowercase']
            },
            {
                pattern: 'UUIDv4',
                valid: ['123e4567-e89b-42d3-a456-556642440000'],
                invalid: ['123456', '123-456', 'not-a-uuid']
            },
            {
                pattern: 'FIREBASE_ID',
                valid: ['pUIHsknWMcE5G4uoAfYN'],
                invalid: ['short', 'too-long-firebase-id--lll', '!!!invalid!!!']
            }
        ];

        testCases.forEach(({ pattern, valid, invalid }) => {
            describe(`${pattern}`, () => {
                valid.forEach(value => {
                    it(`debería validar ${value}`, () => {
                        assert.isTrue(Validator.ValidReg[pattern].test(value));
                    });
                });

                invalid.forEach(value => {
                    it(`debería rechazar ${value}`, () => {
                        assert.isFalse(Validator.ValidReg[pattern].test(value));
                    });
                });
            });
        });
    });
    describe('splitObjectProps method', () => {
        it('deberia separar las propiedades referidas del objeto principl ', () => {
            const params = { userId: '123e45', name: 'ccc', picture:'picture', useImg: true, saver: false };
            const result = Validator.splitObjectProps(params,['useImg', 'saver'] );
            assert.deepEqual(result, {rest:{ userId: '123e45', name: 'ccc', picture:'picture'}, useImg: true, saver: false });
        })
        
      
    })
    
});



