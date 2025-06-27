import clsx from 'clsx';
import { MouseEventHandler, ReactNode } from 'react';
import tw from 'tailwind-styled-components';
import Button from '../base/Button';
import Modal from '../base/Modal';

const ModalHeader = tw.div`uppercase text-2xl`
const ModalBody = tw.div`block text-lg`
const ModalFooter = tw.div`flex max-w-sm space-x-2 mt-2 mr-0 ml-auto`

type Props = {
  children: ReactNode;
  className: String;
  setOpen: Function;
  isDisableSubmit?: boolean;
  isLoading?: boolean;
  isOneButton?: boolean;
  isOpen: boolean;
  maxWidth?: String;
  onClickSuccess: MouseEventHandler<HTMLButtonElement>;
  successLabel?: String;
  title: String;
}

function DialogWrap({
  title,
  isOpen,
  setOpen,
  isLoading,
  onClickSuccess,
  successLabel = 'OK',
  children,
  maxWidth,
  isDisableSubmit,
  className,
  isOneButton,
}: Props) {
  function handleClickClose() {
    setOpen(false);
  }
  return (
    <Modal
      // className={clsx('dialogWrap', className)}
      aria-labelledby="customized-dialog-title"
      isOpen={isOpen}
      onClose={handleClickClose}
    >
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        {children}
      </ModalBody>
      <ModalFooter>
        {!isOneButton && (
          <Button className={clsx('dialogWrap--button', 'dialogWrap--button__cancel')} autoFocus onClick={handleClickClose} style={{}}>
            {('Cancel')}
          </Button>
        )}
        <Button
          className={clsx('dialogWrap--button', { 'dialogWrap--button__disabled': isDisableSubmit })}
          onClick={onClickSuccess}
          disabled={isDisableSubmit}
          color="primary"
        >
          {/* {isLoading && (
            <CircularProgress size={20} className="margin-circular" />
          )} */}
          {successLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default DialogWrap;
