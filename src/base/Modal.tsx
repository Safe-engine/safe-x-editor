import { Dialog, Transition } from '@headlessui/react';
import PropTypes from 'prop-types';
import { Fragment, useEffect } from 'react';
import { BiXCircle } from "react-icons/bi";

function Modal({ children, onClose, isOpen, title }) {

  function handleEsc(e) {
    if (e.key === 'Esc' || e.key === 'Escape') {
      onClose();
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  });

  return <Transition appear show={isOpen} as={Fragment}>
    <Dialog
      as='div'
      className='fixed inset-0 z-[101] overflow-y-auto bg-black bg-opacity-60'
      onClose={onClose}
    >
      <div className='min-h-screen px-4 text-center'>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <Dialog.Overlay className='fixed inset-0' />
        </Transition.Child>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span
          className='inline-block h-screen align-middle'
          aria-hidden='true'
        >
          &#8203;
        </span>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95'
          enterTo='opacity-100 scale-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          <div className='inline-block my-8 min-w-[320px] border border-[#111] bg-[#252525] p-4 text-left align-middle text-[#dcdcdc] shadow-xl transition-all transform -translate-y-20 translate-x-5'>
            <Dialog.Title
              as='h3'
              className='border-b border-[#151515] pb-3 text-center text-[12px] font-bold uppercase tracking-wide text-[#f0f0f0]'
            >
              {title}
            </Dialog.Title>
            <div className='absolute right-2 top-2 z-50 cursor-pointer' onClick={onClose}>
              <BiXCircle className='w-5 h-5 text-[#8f8f8f] hover:text-[#f0f0f0]' />
            </div>
            {children}
          </div>
        </Transition.Child>
      </div>
    </Dialog>
  </Transition>;
}

Modal.propTypes = {
  children: PropTypes.any.isRequired,
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string,
};

Modal.defaultProps = {
  title: '',
};

export default Modal;
