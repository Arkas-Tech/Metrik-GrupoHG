"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { UserCircleIcon, KeyIcon } from "@heroicons/react/24/solid";

interface ConfigSidebarCoordinadorProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
}

const menuItemsCoordinador = [
  {
    id: "mi-perfil",
    name: "Mi Perfil",
    icon: UserCircleIcon,
    description: "Administrar mi información personal",
  },
  {
    id: "cambiar-contrasena",
    name: "Cambiar Contraseña",
    icon: KeyIcon,
    description: "Actualizar mi contraseña de acceso",
  },
];

export default function ConfigSidebarCoordinador({
  isOpen,
  onClose,
  onNavigate,
}: ConfigSidebarCoordinadorProps) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    <div className="px-4 py-6 sm:px-6 bg-blue-600">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold leading-6 text-white">
                          Mi Panel
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="rounded-md bg-blue-600 text-blue-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            onClick={onClose}
                          >
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-blue-200">
                          Gestión de perfil personal
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 px-4 py-6 sm:px-6">
                      <div className="space-y-2">
                        {menuItemsCoordinador.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id);
                              onClose();
                            }}
                            className="w-full group flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                          >
                            <item.icon
                              className="mr-3 h-6 w-6 text-gray-400 group-hover:text-blue-500"
                              aria-hidden="true"
                            />
                            <div className="text-left">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-gray-500 group-hover:text-blue-400">
                                {item.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                      <div className="text-xs text-gray-500 text-center">
                        Panel de Coordinador
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
