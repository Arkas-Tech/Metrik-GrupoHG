from database import SessionLocal, engine
from models import Users, Base, Facturas, Proyecciones, Proveedores, Marcas, Eventos, BriefsEventos, ActividadesEventos, CronogramasEventos, FacturaArchivos, FacturaCotizaciones
from passlib.context import CryptContext

# Crear las tablas
Base.metadata.create_all(bind=engine)

# Contexto para hashear contraseñas
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Usuarios por defecto
usuarios_default = [
    {
        "username": "yosch",
        "email": "yosch@grupohg.com",
        "full_name": "Yosmar Chavez",
        "password": "ay123",
        "role": "administrador"
    },
    {
        "username": "phaddad",
        "email": "phaddad@grupohg.com.mx",
        "full_name": "Pablo Haddad",
        "password": "test123",
        "role": "administrador"
    },
    {
        "username": "rcamacho",
        "email": "gtemercadotecnia@grupohg.com.mx",
        "full_name": "Rodrigo Camacho",
        "password": "test123",
        "role": "administrador"
    },
    {
        "username": "pvillalobos",
        "email": "mercadotecnia@grupohg.com.mx",
        "full_name": "Perla Villalobos",
        "password": "test123",
        "role": "coordinador"
    },
    {
        "username": "lfierro",
        "email": "mercadotecnia2@grupohg.com.mx",
        "full_name": "Lesly Fierro",
        "password": "test123",
        "role": "coordinador"
    },
    {
        "username": "dguzman",
        "email": "mercadotecniajrz@grupohg.com.mx",
        "full_name": "Dafne Guzman",
        "password": "test123",
        "role": "coordinador"
    },
    {
        "username": "iestupinan",
        "email": "mercadotecniajrz2@grupohg.com.mx",
        "full_name": "Ivan Estupiñan",
        "password": "test123",
        "role": "coordinador"
    },
    {
        "username": "arosales",
        "email": "mercadotecniadgo@grupohg.com.mx",
        "full_name": "America Rosales",
        "password": "test123",
        "role": "coordinador"
    },
    {
        "username": "auditor1",
        "email": "auditor@grupohg.com.mx",
        "full_name": "Usuario Auditor",
        "password": "audit123",
        "role": "auditor"
    }
]

def init_database():
    db = SessionLocal()
    try:
        # Verificar si ya existen usuarios
        existing_users = db.query(Users).count()
        if existing_users > 0:
            print(f"Ya existen {existing_users} usuarios en la base de datos.")
            return

        # Crear usuarios por defecto
        for user_data in usuarios_default:
            hashed_password = bcrypt_context.hash(user_data["password"])
            
            user = Users(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=hashed_password,
                role=user_data["role"]
            )
            
            db.add(user)
        
        db.commit()
        print(f"Se crearon {len(usuarios_default)} usuarios por defecto.")
        
        # Mostrar usuarios creados
        print("\nUsuarios creados:")
        for user_data in usuarios_default:
            print(f"- {user_data['username']} ({user_data['role']}) - {user_data['email']}")
            
    except Exception as e:
        db.rollback()
        print(f"Error al inicializar la base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Inicializando base de datos...")
    init_database()
    print("Inicialización completada.")