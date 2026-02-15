from datetime import timedelta, datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import SessionLocal
from sqlalchemy.orm import Session
from models import Users, PasswordResetCodes
from passlib.context import CryptContext
from starlette import status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import jwt, JWTError
import random
import string
from email_service import send_password_reset_email

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

SECRET_KEY = '22d259b81d5448bfc4616f6aa4f9beecdbf0304262876cb79eb86f3ec34ffea7'
ALGORITHM = 'HS256'

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

class CreateUserRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


def get_db():
    print("DEBUG get_db: Creando sesión de base de datos")
    db = SessionLocal()
    try:
        # Probar la conexión
        user_count = db.query(Users).count()
        print(f"DEBUG get_db: Conexión exitosa, {user_count} usuarios encontrados")
        yield db
    finally: 
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

def authenticate_user(username: str, password: str, db):
    print(f"DEBUG authenticate_user: Buscando usuario con email {username}")
    user = db.query(Users).filter(Users.email == username).first()
    if not user:
        print(f"DEBUG authenticate_user: Usuario con email {username} no encontrado")
        return False
    print(f"DEBUG authenticate_user: Usuario encontrado: {user.email}")
    verification = bcrypt_context.verify(password, user.hashed_password)
    print(f"DEBUG authenticate_user: Verificación contraseña: {verification}")
    if not verification:
        print(f"DEBUG authenticate_user: Contraseña incorrecta para {username}")
        return False
    print(f"DEBUG authenticate_user: Autenticación exitosa para {username}")
    return user


def create_access_token(username: str, user_id: int, role: str, expires_delta: timedelta):
    encode = {'sub': username, 'id': user_id, 'role': role}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({'exp': expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub')
        user_id: int = payload.get('id')
        user_role: str = payload.get('role')
        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='Could not validate credentials')
        return {'username': username, 'id': user_id, 'role': user_role}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='Could not validate credentials')

user_dependency = Annotated[dict, Depends(get_current_user)]

@router.get("/users", status_code=status.HTTP_200_OK)
async def get_all_users(user: user_dependency, db: db_dependency):
    if user is None or user.get('role') != 'administrador':
        raise HTTPException(status_code=403, detail='Solo administradores pueden acceder a esta función')
    
    users = db.query(Users).all()
    return [{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'full_name': u.full_name,
        'role': u.role
    } for u in users]

@router.get("/coordinadores", status_code=status.HTTP_200_OK)
async def get_coordinadores(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail='No autenticado')
    
    coordinadores = db.query(Users).filter(Users.role == 'coordinador').all()
    return [{
        'id': u.id,
        'username': u.username,
        'full_name': u.full_name
    } for u in coordinadores]

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(user: user_dependency,
                      db: db_dependency, 
                      create_user_request: CreateUserRequest):
    if user is None or user.get('role') != 'administrador':
        raise HTTPException(status_code=403, detail='Solo administradores pueden crear usuarios')
    
    # Verificar si el usuario ya existe
    existing_user = db.query(Users).filter(
        (Users.username == create_user_request.username) | 
        (Users.email == create_user_request.email)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail='Usuario o email ya existe')
    
    create_user_model = Users(
        email=create_user_request.email,
        username=create_user_request.username,
        full_name=create_user_request.full_name,
        hashed_password=bcrypt_context.hash(create_user_request.password),
        role=create_user_request.role
    )

    db.add(create_user_model)
    db.commit()
    db.refresh(create_user_model)
    
    return {
        'id': create_user_model.id,
        'username': create_user_model.username,
        'email': create_user_model.email,
        'full_name': create_user_model.full_name,
        'role': create_user_model.role
    }

@router.put("/users/{user_id}", status_code=status.HTTP_200_OK)
async def update_user(current_user: user_dependency, db: db_dependency, 
                     user_id: int, update_request: CreateUserRequest):
    if current_user is None:
        raise HTTPException(status_code=401, detail='No autenticado')
    
    # Permitir a administradores modificar cualquier usuario
    # Permitir a coordinadores modificar solo su propio perfil
    if current_user.get('role') != 'administrador' and current_user.get('id') != user_id:
        raise HTTPException(status_code=403, detail='No tienes permisos para modificar este usuario')
    
    user_to_update = db.query(Users).filter(Users.id == user_id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    
    # Verificar duplicados (excluyendo el usuario actual)
    existing_user = db.query(Users).filter(
        ((Users.username == update_request.username) | 
         (Users.email == update_request.email)) &
        (Users.id != user_id)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail='Usuario o email ya existe')
    
    user_to_update.username = update_request.username
    user_to_update.email = update_request.email
    user_to_update.full_name = update_request.full_name
    
    # Solo administradores pueden cambiar roles
    if current_user.get('role') == 'administrador':
        user_to_update.role = update_request.role
    
    # Solo actualizar contraseña si se proporciona una nueva
    if update_request.password and update_request.password.strip():
        user_to_update.hashed_password = bcrypt_context.hash(update_request.password)
    
    db.commit()
    db.refresh(user_to_update)
    
    return {
        'id': user_to_update.id,
        'username': user_to_update.username,
        'email': user_to_update.email,
        'full_name': user_to_update.full_name,
        'role': user_to_update.role
    }

@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(current_user: user_dependency, db: db_dependency, user_id: int):
    if current_user is None or current_user.get('role') != 'administrador':
        raise HTTPException(status_code=403, detail='Solo administradores pueden eliminar usuarios')
    
    # No permitir que se eliminen a sí mismos
    if current_user.get('id') == user_id:
        raise HTTPException(status_code=400, detail='No puedes eliminarte a ti mismo')
    
    user_to_delete = db.query(Users).filter(Users.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    
    db.delete(user_to_delete)
    db.commit()
    
    return {'message': 'Usuario eliminado exitosamente'}


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                                 db: db_dependency):
    print(f"DEBUG: Intentando login con username: {form_data.username}")
    user = authenticate_user(form_data.username, form_data.password, db)
    print(f"DEBUG: Resultado autenticación: {user}")
    if not user:
        print(f"DEBUG: Autenticación falló para {form_data.username}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Could not validate credentials')
    
    token = create_access_token(user.username, user.id, user.role, timedelta(hours=8))
    print(f"DEBUG: Token creado exitosamente para {user.username}")

    return {'access_token': token, 'token_type': 'bearer'}

@router.get("/user", status_code=status.HTTP_200_OK)
async def read_user(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed')
    
    user_info = db.query(Users).filter(Users.id == user.get('id')).first()
    if user_info is None:
        raise HTTPException(status_code=404, detail='User not found')
    
    return {
        'id': user_info.id,
        'username': user_info.username,
        'email': user_info.email,
        'full_name': user_info.full_name,
        'role': user_info.role
    }

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    user: user_dependency,
    db: db_dependency,
    password_request: ChangePasswordRequest
):
    """
    Permite a los usuarios (coordinadores incluidos) cambiar su propia contraseña.
    Requiere proporcionar la contraseña actual para validar la identidad.
    """
    if user is None:
        raise HTTPException(status_code=401, detail='No autenticado')
    
    # Obtener el usuario actual de la base de datos
    current_user = db.query(Users).filter(Users.id == user.get('id')).first()
    if not current_user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    
    # Verificar que la contraseña actual sea correcta
    if not bcrypt_context.verify(password_request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='La contraseña actual es incorrecta'
        )
    
    # Validar que la nueva contraseña no esté vacía
    if not password_request.new_password or len(password_request.new_password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='La nueva contraseña debe tener al menos 6 caracteres'
        )
    
    # Actualizar la contraseña
    current_user.hashed_password = bcrypt_context.hash(password_request.new_password)
    db.commit()
    
    return {
        'message': 'Contraseña actualizada exitosamente',
        'username': current_user.username
    }


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Solicitar código de recuperación de contraseña
    """
    # Verificar que el email existe
    user = db.query(Users).filter(Users.email == request.email).first()
    if not user:
        # Por seguridad, no revelar si el email existe o no
        return {
            'message': 'Si el correo está registrado, recibirás un código de verificación',
            'success': True
        }
    
    # Generar código de 6 dígitos
    code = ''.join(random.choices(string.digits, k=6))
    
    # Crear registro del código con expiración de 15 minutos
    # Usar hora local sin timezone para consistencia con la BD
    expires_at = datetime.now() + timedelta(minutes=15)
    
    reset_code = PasswordResetCodes(
        email=request.email,
        code=code,
        expires_at=expires_at,
        used=False
    )
    
    db.add(reset_code)
    db.commit()
    
    # Enviar el código por email
    email_sent = send_password_reset_email(request.email, code)
    
    if not email_sent:
        print(f"⚠️  No se pudo enviar el email. Código para {request.email}: {code}")
    
    return {
        'message': 'Si el correo está registrado, recibirás un código de verificación',
        'success': True
    }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Verificar código y resetear contraseña
    """
    # Buscar el código más reciente no usado
    reset_record = db.query(PasswordResetCodes).filter(
        PasswordResetCodes.email == request.email,
        PasswordResetCodes.code == request.code,
        PasswordResetCodes.used == False
    ).order_by(PasswordResetCodes.created_at.desc()).first()
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Código inválido o ya utilizado'
        )
    
    # Verificar que no haya expirado
    # Usar hora local sin timezone para consistencia
    if datetime.now() > reset_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='El código ha expirado. Solicita uno nuevo'
        )
    
    # Validar la nueva contraseña
    if not request.new_password or len(request.new_password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='La contraseña debe tener al menos 6 caracteres'
        )
    
    # Buscar el usuario
    user = db.query(Users).filter(Users.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Usuario no encontrado'
        )
    
    # Actualizar la contraseña
    user.hashed_password = bcrypt_context.hash(request.new_password)
    
    # Marcar el código como usado
    reset_record.used = True
    reset_record.used_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {
        'message': 'Contraseña actualizada exitosamente',
        'success': True
    }
